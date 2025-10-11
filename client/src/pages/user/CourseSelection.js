"use client"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import { useNotification } from "../../contexts/NotificationContext"
import ProgressRing from '../../components/ProgressRing'
import SubscriptionModal from "./SubscriptionModal"
import styles from "../../styles/course-selection.module.css"
import api from "../../utils/api"

// Portal component for rendering dropdowns outside the main DOM hierarchy
const Portal = ({ children, className }) => {
  const [portalElement, setPortalElement] = useState(null);

  useEffect(() => {
    const element = document.createElement('div');
    element.className = className || 'dropdown-portal';
    document.body.appendChild(element);
    setPortalElement(element);

    return () => {
      if (element && document.body.contains(element)) {
        document.body.removeChild(element);
      }
    };
  }, [className]);

  if (!portalElement) return null;

  return require('react-dom').createPortal(children, portalElement);
};

const CourseSelection = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { showNotification } = useNotification()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [courseYears, setCourseYears] = useState({})
  const [courseTopics, setCourseTopics] = useState({})
  const [courses, setCourses] = useState({ first: [], second: [] })
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedTopics, setSelectedTopics] = useState(new Set())
  const [showTopicPopup, setShowTopicPopup] = useState(false)
  const [currentTopicDropdown, setCurrentTopicDropdown] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState({})
  const [studyProgress, setStudyProgress] = useState({})
  const [fetchingQuestions, setFetchingQuestions] = useState(false)
  const [fetchingYears, setFetchingYears] = useState(false)
  const [fetchingTopics, setFetchingTopics] = useState(false)
  const [fetchingCourses, setFetchingCourses] = useState(false)
  const [progressLoading, setProgressLoading] = useState(true)
  const [progressError, setProgressError] = useState(null)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [loadingPayment, setLoadingPayment] = useState(false)
  
  // Simplified dropdown state
  const [openDropdown, setOpenDropdown] = useState({ courseCode: null, type: null })
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  
  // Get exam type from URL params
  const urlParams = new URLSearchParams(location.search)
  const examType = urlParams.get("type") || "study"
  const isMockMode = examType === "mock"
  
  // Refs for dropdown containers
  const dropdownRefs = useRef({})
  const dropdownTriggerRefs = useRef({})
  
  // Check if user is subscribed
  const isSubscribed = user?.isSubscribed || false
  
  // Fetch study progress for all courses (only for subscribed users)
  const loadAllStudyProgress = useCallback(async () => {
    if (isMockMode || !isSubscribed) return;

    setProgressLoading(true);
    setProgressError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await api.get("/api/questions/study-progress", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setStudyProgress(response.data.progress);
      } else {
        throw new Error(response.data.message || "Failed to load study progress");
      }
    } catch (error) {
      console.error("Failed to load study progress:", error);
      setProgressError(error.message);
      setStudyProgress({});

      if (error.response) {
        if (error.response.status === 404) {
          showNotification(
            "Study progress endpoint not found. This feature may be temporarily unavailable.",
            "warning"
          );
        } else {
          showNotification(
            `Failed to load study progress: ${error.response.data.message || error.message}`,
            "error"
          );
        }
      } else if (error.request) {
        showNotification(
          "Network error. Please check your connection and try again.",
          "error"
        );
      } else {
        showNotification(
          `Failed to load study progress: ${error.message}`,
          "error"
        );
      }
    } finally {
      setProgressLoading(false);
    }
  }, [isMockMode, isSubscribed, showNotification])
  
  const fetchCourses = useCallback(async () => {
    setFetchingCourses(true)
    try {
      const token = localStorage.getItem("token")
      const response = await api.get("/api/courses", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      setCourses(response.data)
    } catch (error) {
      console.error("Failed to fetch courses:", error)
      setError("Failed to load courses. Please check your connection and try again.")
    } finally {
      setFetchingCourses(false)
    }
  }, [])
  
  const fetchCourseYears = useCallback(async () => {
    setFetchingYears(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      const response = await api.get("/api/questions/course-years", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (!response.data || Object.keys(response.data).length === 0) {
        setError("No course data available. Please contact support.")
        return
      }
      
      setCourseYears(response.data)
    } catch (error) {
      console.error("Failed to fetch course years:", error)
      setError("Failed to load course data. Please check your connection and try again.")
    } finally {
      setFetchingYears(false)
      setLoading(false)
    }
  }, [])
  
  const fetchTopics = useCallback(async (courseCode) => {
    if (!isSubscribed) return;
    
    setFetchingTopics(true)
    try {
      const token = localStorage.getItem("token")
      const response = await api.get(`/api/questions/topics/${courseCode}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      const topics = response.data
      
      if (!topics || topics.length === 0) {
        showNotification(`No topics available for ${courseCode}. Please select another course.`, "error")
        handleCourseSelect(courseCode, false)
        return
      }
      
      setCourseTopics((prev) => ({
        ...prev,
        [courseCode]: topics,
      }))
      setSelectedTopics(new Set(topics))
    } catch (error) {
      console.error("Failed to fetch topics:", error)
      showNotification(`Failed to load topics for ${courseCode}. Please try again.`, "error")
      handleCourseSelect(courseCode, false)
    } finally {
      setFetchingTopics(false)
    }
  }, [isSubscribed, showNotification])

  const handleCourseSelect = useCallback((courseCode, isSelected) => {
    if (!isSubscribed) {
      setShowSubscriptionModal(true)
      return false
    }
    
    if (isSelected) {
      if (selectedCourse && selectedCourse !== courseCode) {
        setFormData((prev) => {
          const newData = { ...prev };
          delete newData[selectedCourse];
          return newData;
        });
        setCourseTopics((prev) => {
          const newTopics = { ...prev };
          delete newTopics[selectedCourse];
          return newTopics;
        });
      }
      
      if (!courseYears[courseCode] || courseYears[courseCode].length === 0) {
        showNotification(`No questions available for ${courseCode}. Please select another course.`, "error")
        return false;
      }
      
      setSelectedCourse(courseCode);
      fetchTopics(courseCode);
      
      setFormData((prev) => ({
        ...prev,
        [courseCode]: {
          year: "",
          yearLabel: "",
          questions: "",
          questionsLabel: "",
          time: isMockMode ? "" : undefined,
          timeLabel: isMockMode ? "" : undefined,
          topics: "all",
        },
      }));
    } else {
      setSelectedCourse(null);
      setFormData((prev) => {
        const newData = { ...prev };
        delete newData[courseCode];
        return newData;
      });
      setCourseTopics((prev) => {
        const newTopics = { ...prev };
        delete newTopics[selectedCourse];
        return newTopics;
      });
      setSelectedTopics(new Set());
    }
    return true;
  }, [isSubscribed, selectedCourse, courseYears, fetchTopics, showNotification, isMockMode])
  
  const calculateDropdownPosition = useCallback((courseCode, type) => {
    const triggerElement = dropdownTriggerRefs.current[`${courseCode}-${type}`];
    if (triggerElement) {
      const rect = triggerElement.getBoundingClientRect();
      return {
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      };
    }
    return { top: 0, left: 0, width: 0 };
  }, [])
  
  const handleDropdownClick = useCallback((courseCode, type) => {
    if (!isSubscribed) {
      setShowSubscriptionModal(true)
      return
    }
    
    if (openDropdown.courseCode === courseCode && openDropdown.type === type) {
      setOpenDropdown({ courseCode: null, type: null });
      return;
    }
    
    setOpenDropdown({ courseCode: null, type: null });
    
    if (type === "topics") {
      if (!courseTopics[courseCode] || courseTopics[courseCode].length === 0) {
        showNotification(`No topics available for ${courseCode}. Please select another course.`, "error")
        return
      }
      setCurrentTopicDropdown(courseCode)
      setShowTopicPopup(true)
      return
    }
    
    const position = calculateDropdownPosition(courseCode, type);
    setDropdownPosition(position);
    
    setTimeout(() => {
      setOpenDropdown({ courseCode, type });
    }, 10);
  }, [isSubscribed, openDropdown, courseTopics, showNotification, navigate, calculateDropdownPosition])
  
  const handleOptionSelect = useCallback((courseCode, type, value, label) => {
    setFormData((prev) => ({
      ...prev,
      [courseCode]: {
        ...prev[courseCode],
        [type]: value,
        [`${type}Label`]: label,
      },
    }))
    
    setOpenDropdown({ courseCode: null, type: null });
  }, [])
  
  const handleTopicSelection = useCallback((topic, isSelected) => {
    setSelectedTopics((prev) => {
      const newSet = new Set(prev)
      if (isSelected) {
        newSet.add(topic)
      } else {
        newSet.delete(topic)
      }
      return newSet
    })
  }, [])
  
  const handleTopicConfirm = useCallback(() => {
    const topicsArray = Array.from(selectedTopics)
    const allTopics = courseTopics[currentTopicDropdown] || []
    let topicsText
    if (topicsArray.length === allTopics.length) {
      topicsText = "all"
    } else if (topicsArray.length === 1) {
      topicsText = "1 topic selected"
    } else {
      topicsText = `${topicsArray.length} topics selected`
    }
    setFormData((prev) => ({
      ...prev,
      [currentTopicDropdown]: {
        ...prev[currentTopicDropdown],
        topics: topicsText,
        selectedTopics: topicsArray,
      },
    }))
    setShowTopicPopup(false)
  }, [selectedTopics, courseTopics, currentTopicDropdown])
  
  const handleStartExam = useCallback(async () => {
    if (!isSubscribed) {
      setShowSubscriptionModal(true)
      return
    }
    
    if (!selectedCourse) {
      showNotification("Please select a course", "error")
      return
    }
    
    const courseDataObj = formData[selectedCourse]
    if (!courseDataObj?.year) {
      showNotification("Please select a year", "error")
      return
    }
    if (!courseDataObj?.questions) {
      showNotification("Please select number of questions", "error")
      return
    }
    if (isMockMode && !courseDataObj?.time) {
      showNotification("Please select time limit", "error")
      return
    }
    
    setFetchingQuestions(true)
    try {
      let topicsToSend = "all"
      if (courseDataObj.selectedTopics && courseDataObj.selectedTopics.length < (courseTopics[selectedCourse]?.length || 0)) {
        topicsToSend = courseDataObj.selectedTopics
      }
      const requestData = {
        course: selectedCourse,
        year: courseDataObj.year,
        topics: topicsToSend,
        questionCount: Number.parseInt(courseDataObj.questions),
        examType: examType,
        ...(isMockMode && { timeAllowed: Number.parseInt(courseDataObj.time) }),
      }
      
      const token = localStorage.getItem("token")
      const response = await api.post("/api/questions/fetch", requestData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      
      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to fetch questions")
      }
      
      if (!response.data.questions || response.data.questions.length === 0) {
        throw new Error("No questions found for the selected criteria. Please try different options.")
      }
      
      localStorage.setItem(
        "currentExam",
        JSON.stringify({
          ...requestData,
          questions: response.data.questions,
          examType: examType,
        }),
      )
      
      navigate(isMockMode ? "/mock" : "/study")
    } catch (error) {
      console.error("Failed to start exam:", error)
      showNotification(error.response?.data?.message || error.message || "Failed to start exam", "error")
    } finally {
      setFetchingQuestions(false)
    }
  }, [isSubscribed, selectedCourse, formData, courseTopics, examType, isMockMode, showNotification, navigate])
  
  // Handle activate functionality - show subscription modal
  const handleActivate = useCallback(async () => {
    if (user?.isSubscribed) {
      showNotification("You are already subscribed!", "info");
      return;
    }
    
    setShowSubscriptionModal(true);
  }, [user, showNotification])
  
  // Initialize payment with new structure (subscriptionType and months)
  const initializePayment = useCallback(async (subscriptionType, months) => {
    setLoadingPayment(true);
    try {
      const response = await api.post("/api/payments/initialize", {
        subscriptionType,
        months,
      });
      
      if (response.data.status === "success") {
        window.location.href = response.data.data.link;
      } else {
        showNotification("Failed to initialize payment", "error");
      }
    } catch (error) {
      console.error("Payment initialization failed:", error);
      showNotification(error.response?.data?.message || "Failed to initialize payment", "error");
    } finally {
      setLoadingPayment(false);
    }
  }, [showNotification])
  
  // Initialize data
  useEffect(() => {
    fetchCourses()
    fetchCourseYears()
  }, [fetchCourses, fetchCourseYears])
  
  // Load study progress when data is ready
  useEffect(() => {
    if (!fetchingYears && Object.keys(courseYears).length > 0 && !isMockMode && isSubscribed) {
      loadAllStudyProgress();
    }
  }, [fetchingYears, courseYears, isMockMode, isSubscribed, loadAllStudyProgress])
  
  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      let clickedOutside = true;
      
      Object.keys(dropdownTriggerRefs.current).forEach(key => {
        if (dropdownTriggerRefs.current[key] && dropdownTriggerRefs.current[key].contains(event.target)) {
          clickedOutside = false;
        }
      });
      
      const dropdowns = document.querySelectorAll(`.${styles.dropdownOptions}`);
      dropdowns.forEach(dropdown => {
        if (dropdown.contains(event.target)) {
          clickedOutside = false;
        }
      });
      
      if (clickedOutside && (openDropdown.courseCode || openDropdown.type)) {
        setOpenDropdown({ courseCode: null, type: null });
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [openDropdown])
  
  // Filter courses based on search term
  const filteredCourses = useCallback((semesterCourses) => {
    if (!searchTerm) return semesterCourses
    return semesterCourses.filter(
      (course) =>
        course.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm])
  
  // Get dropdown options based on type
  const getDropdownOptions = useCallback((courseCode, type) => {
    switch (type) {
      case "year":
        const years = courseYears[courseCode] || []
        if (years.length === 0) {
          showNotification(`No years available for ${courseCode}. Please select another course.`, "error")
          return []
        }
        return years.map((year) => ({ value: year, label: year }))
      case "questions":
        return [
          { value: "all", label: "All Questions" }, 
          { value: "10", label: "10 Questions" },
          { value: "20", label: "20 Questions" },
          { value: "30", label: "30 Questions" },
          { value: "50", label: "50 Questions" },
          { value: "100", label: "100 Questions" },
          { value: "120", label: "120 Questions" },
        ]
      case "time":
        return [
          { value: "5", label: "5 minutes" },
          { value: "10", label: "10 minutes" },
          { value: "20", label: "20 minutes" },
          { value: "25", label: "25 minutes" },
          { value: "30", label: "30 minutes" },
          { value: "45", label: "45 minutes" },
          { value: "60", label: "60 minutes" },
        ]
      default:
        return []
    }
  }, [courseYears, showNotification])
  
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading courses...</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorMessage}>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => {
            fetchCourses()
            fetchCourseYears()
          }} className={styles.retryBtn}>
            Retry
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className={styles.courseSelectionPage}>
      {/* Subscription Banner for Unsubscribed Users */}
      {!isSubscribed && (
        <div className={styles.subscriptionBanner}>
          <div className={styles.bannerContent}>
            <i className="fas fa-lock"></i>
            <p>Subscribe to access study materials and start practicing</p>
            <button 
              className={styles.subscribeBtn}
              onClick={handleActivate}
            >
              Subscribe Now
            </button>
          </div>
        </div>
      )}
      
      {/* Continue Button */}
      <button 
        className={styles.continueBtn} 
        onClick={handleStartExam} 
        disabled={fetchingQuestions || fetchingTopics}
      >
        {fetchingQuestions ? "Loading Questions..." : "Continue"}
      </button>
      
      {/* Header */}
      <nav className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate("/home")}>
          <i className="fa fa-arrow-left"></i>
        </button>
        <div className={styles.navTitle}>Select Courses</div>
        <div className={styles.searchContainer}>
          <i className={`fas fa-search ${styles.searchIcon}`}></i>
          <input
            className={styles.search}
            type="search"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </nav>
      
      <div className={styles.pageHeader}>
        <div className={styles.headerCaption}>100 Level Courses</div>
      </div>
      
      {/* First Semester */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>First Semester Courses</div>
        <div className={styles.courses}>
          {filteredCourses(courses.first).map((course) => (
            <div 
              key={course.courseCode} 
              className={`${styles.singleCourse} ${selectedCourse === course.courseCode ? styles.active : ''} ${!isSubscribed ? styles.disabled : ''}`}
              ref={el => dropdownRefs.current[course.courseCode] = el}
            >
              <div 
                className={styles.courseName} 
                onClick={() => {
                  if (!isSubscribed) {
                    setShowSubscriptionModal(true)
                    return
                  }
                  const checkbox = document.getElementById(`checkbox-${course.courseCode}`)
                  checkbox.checked = !checkbox.checked
                  handleCourseSelect(course.courseCode, checkbox.checked)
                }}
              >
                <span className={styles.select}>
                  <input 
                    type="checkbox" 
                    id={`checkbox-${course.courseCode}`} 
                    checked={selectedCourse === course.courseCode} 
                    onChange={(e) => handleCourseSelect(course.courseCode, e.target.checked)} 
                    disabled={!isSubscribed}
                  />
                </span>
                {course.courseCode.toUpperCase()} - {course.courseName}
                {!isSubscribed && (
                  <i className={`fas fa-lock ${styles.lockIcon}`}></i>
                )}
              </div>
              
              {/* Course options appear directly under the selected course */}
              {selectedCourse === course.courseCode && (
                <div className={`${styles.courseBody} ${styles.active}`}>
                  {fetchingTopics ? (
                    <div className={styles.loadingTopics}>
                      <div className={styles.spinnerSmall}></div>
                      <p>Loading topics...</p>
                    </div>
                  ) : (
                    <div className={styles.formRow}>
                      {/* Year Selection */}
                      <div className={styles.formGroup}>
                        <div className={styles.label}>
                          <span className={styles.labelIcon}>
                            <i className="fa-solid fa-calendar-days"></i>
                          </span>
                          Year
                        </div>
                        <div className={styles.dropdownContainer}>
                          <div 
                            className={styles.dropdownSelected} 
                            onClick={() => handleDropdownClick(course.courseCode, "year")}
                            ref={el => dropdownTriggerRefs.current[`${course.courseCode}-year`] = el}
                          >
                            {formData[course.courseCode]?.yearLabel || "Select Year"}
                            <i className="fas fa-chevron-down"></i>
                          </div>
                        </div>
                      </div>
                      
                      {/* Questions Selection */}
                      <div className={styles.formGroup}>
                        <div className={styles.label}>
                          <span className={styles.labelIcon}>
                            <i className="fa-solid fa-list"></i>
                          </span>
                          Questions
                        </div>
                        <div className={styles.dropdownContainer}>
                          <div 
                            className={styles.dropdownSelected} 
                            onClick={() => handleDropdownClick(course.courseCode, "questions")}
                            ref={el => dropdownTriggerRefs.current[`${course.courseCode}-questions`] = el}
                          >
                            {formData[course.courseCode]?.questionsLabel || "Select Questions"}
                            <i className="fas fa-chevron-down"></i>
                          </div>
                        </div>
                      </div>
                      
                      {/* Time Selection (Mock Mode Only) */}
                      {isMockMode && (
                        <div className={styles.formGroup}>
                          <div className={styles.label}>
                            <span className={styles.labelIcon}>
                              <i className="fa-solid fa-clock"></i>
                            </span>
                            Time (minutes)
                          </div>
                          <div className={styles.dropdownContainer}>
                            <div 
                              className={styles.dropdownSelected} 
                              onClick={() => handleDropdownClick(course.courseCode, "time")}
                              ref={el => dropdownTriggerRefs.current[`${course.courseCode}-time`] = el}
                            >
                              {formData[course.courseCode]?.timeLabel || "Select Time"}
                              <i className="fas fa-chevron-down"></i>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Topics Selection */}
                      <div className={styles.formGroup}>
                        <div className={styles.label}>
                          <span className={styles.labelIcon}>
                            <i className="fa-solid fa-window-maximize"></i>
                          </span>
                          Topics
                        </div>
                        <div 
                          className={styles.dropdownSelected} 
                          onClick={() => handleDropdownClick(course.courseCode, "topics")}
                          ref={el => dropdownTriggerRefs.current[`${course.courseCode}-topics`] = el}
                        >
                          {formData[course.courseCode]?.topics === "all" || !formData[course.courseCode]?.topics ? "All Topics" : formData[course.courseCode].topics}
                          <i className="fas fa-chevron-down"></i>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      
      {/* Second Semester */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Second Semester Courses</div>
        <div className={styles.courses}>
          {filteredCourses(courses.second).map((course) => (
            <div 
              key={course.courseCode} 
              className={`${styles.singleCourse} ${selectedCourse === course.courseCode ? styles.active : ''} ${!isSubscribed ? styles.disabled : ''}`}
              ref={el => dropdownRefs.current[course.courseCode] = el}
            >
              <div 
                className={styles.courseName} 
                onClick={() => {
                  if (!isSubscribed) {
                    setShowSubscriptionModal(true)
                    return
                  }
                  const checkbox = document.getElementById(`checkbox-${course.courseCode}`)
                  checkbox.checked = !checkbox.checked
                  handleCourseSelect(course.courseCode, checkbox.checked)
                }}
              >
                <span className={styles.select}>
                  <input 
                    type="checkbox" 
                    id={`checkbox-${course.courseCode}`} 
                    checked={selectedCourse === course.courseCode} 
                    onChange={(e) => handleCourseSelect(course.courseCode, e.target.checked)} 
                    disabled={!isSubscribed}
                  />
                </span>
                {course.courseCode.toUpperCase()} - {course.courseName}
                {!isSubscribed && (
                  <i className={`fas fa-lock ${styles.lockIcon}`}></i>
                )}
              </div>
              
              {/* Course options appear directly under the selected course */}
              {selectedCourse === course.courseCode && (
                <div className={`${styles.courseBody} ${styles.active}`}>
                  {fetchingTopics ? (
                    <div className={styles.loadingTopics}>
                      <div className={styles.spinnerSmall}></div>
                      <p>Loading topics...</p>
                    </div>
                  ) : (
                    <div className={styles.formRow}>
                      {/* Year Selection */}
                      <div className={styles.formGroup}>
                        <div className={styles.label}>
                          <span className={styles.labelIcon}>
                            <i className="fa-solid fa-calendar-days"></i>
                          </span>
                          Year
                        </div>
                        <div className={styles.dropdownContainer}>
                          <div 
                            className={styles.dropdownSelected} 
                            onClick={() => handleDropdownClick(course.courseCode, "year")}
                            ref={el => dropdownTriggerRefs.current[`${course.courseCode}-year`] = el}
                          >
                            {formData[course.courseCode]?.yearLabel || "Select Year"}
                            <i className="fas fa-chevron-down"></i>
                          </div>
                        </div>
                      </div>
                      
                      {/* Questions Selection */}
                      <div className={styles.formGroup}>
                        <div className={styles.label}>
                          <span className={styles.labelIcon}>
                            <i className="fa-solid fa-list"></i>
                          </span>
                          Questions
                        </div>
                        <div className={styles.dropdownContainer}>
                          <div 
                            className={styles.dropdownSelected} 
                            onClick={() => handleDropdownClick(course.courseCode, "questions")}
                            ref={el => dropdownTriggerRefs.current[`${course.courseCode}-questions`] = el}
                          >
                            {formData[course.courseCode]?.questionsLabel || "Select Questions"}
                            <i className="fas fa-chevron-down"></i>
                          </div>
                        </div>
                      </div>
                      
                      {/* Time Selection (Mock Mode Only) */}
                      {isMockMode && (
                        <div className={styles.formGroup}>
                          <div className={styles.label}>
                            <span className={styles.labelIcon}>
                              <i className="fa-solid fa-clock"></i>
                            </span>
                            Time (minutes)
                          </div>
                          <div className={styles.dropdownContainer}>
                            <div 
                              className={styles.dropdownSelected} 
                              onClick={() => handleDropdownClick(course.courseCode, "time")}
                              ref={el => dropdownTriggerRefs.current[`${course.courseCode}-time`] = el}
                            >
                              {formData[course.courseCode]?.timeLabel || "Select Time"}
                              <i className="fas fa-chevron-down"></i>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Topics Selection */}
                      <div className={styles.formGroup}>
                        <div className={styles.label}>
                          <span className={styles.labelIcon}>
                            <i className="fa-solid fa-window-maximize"></i>
                          </span>
                          Topics
                        </div>
                        <div 
                          className={styles.dropdownSelected} 
                          onClick={() => handleDropdownClick(course.courseCode, "topics")}
                          ref={el => dropdownTriggerRefs.current[`${course.courseCode}-topics`] = el}
                        >
                          {formData[course.courseCode]?.topics === "all" || !formData[course.courseCode]?.topics ? "All Topics" : formData[course.courseCode].topics}
                          <i className="fas fa-chevron-down"></i>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      
      {/* Dropdown Portal - Renders outside the main component hierarchy */}
      {openDropdown.courseCode && openDropdown.type && (
        <Portal className={styles.dropdownPortal}>
          <div 
            className={`${styles.dropdownOptions} ${styles.show}`}
            style={{
              position: 'absolute',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              zIndex: 1000
            }}
          >
            {getDropdownOptions(openDropdown.courseCode, openDropdown.type).map((option) => {
              if (openDropdown.type === "year") {
                const progressData = studyProgress[openDropdown.courseCode]?.[option.value] || {
                  percentage: 0,
                  studiedCount: 0,
                  totalQuestions: 0
                };
                
                return (
                  <div
                    key={option.value}
                    className={styles.dropdownOption}
                    onClick={() => handleOptionSelect(openDropdown.courseCode, openDropdown.type, option.value, option.label)}
                  >
                    <span>{option.label}</span>
                    {!isMockMode && isSubscribed && (
                      <div className={styles.progressIndicator}>
                        {progressLoading ? (
                          <div className={styles.spinnerMini}></div>
                        ) : progressError ? (
                          <span title={progressError} className={styles.errorIcon}>!</span>
                        ) : (
                          <ProgressRing percentage={progressData.percentage} radius={12} stroke={2} />
                        )}
                      </div>
                    )}
                  </div>
                );
              } else {
                return (
                  <div
                    key={option.value}
                    className={styles.dropdownOption}
                    onClick={() => handleOptionSelect(openDropdown.courseCode, openDropdown.type, option.value, option.label)}
                  >
                    {option.label}
                  </div>
                );
              }
            })}
          </div>
        </Portal>
      )}
      
      {/* Topic Selection Popup */}
      {showTopicPopup && (
        <div className={styles.topicPopupOverlay}>
          <div className={styles.topicPopup}>
            <div className={styles.topicPopupHeader}>
              <h3>Select Topics of Interest</h3>
            </div>
            <div className={styles.topicPopupContent}>
              <div className={styles.topicOption}>
                <input
                  type="checkbox"
                  id="topic-all"
                  checked={selectedTopics.size === courseTopics[currentTopicDropdown]?.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTopics(new Set(courseTopics[currentTopicDropdown] || []))
                    } else {
                      setSelectedTopics(new Set())
                    }
                  }}
                />
                <label htmlFor="topic-all">All Topics</label>
              </div>
              {(courseTopics[currentTopicDropdown] || []).map((topic, index) => (
                <div key={topic} className={styles.topicOption}>
                  <input
                    type="checkbox"
                    id={`topic-${index}`}
                    checked={selectedTopics.has(topic)}
                    onChange={(e) => handleTopicSelection(topic, e.target.checked)}
                  />
                  <label htmlFor={`topic-${index}`}>{topic}</label>
                </div>
              ))}
            </div>
            <div className={styles.topicPopupActions}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowTopicPopup(false)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleTopicConfirm}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Debug information - only in development */}
      {process.env.NODE_ENV === 'development' && progressError && (
        <div className={styles.debugInfo}>
          <p>Debug: Study Progress Error - {progressError}</p>
        </div>
      )}
      
      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        user={user}
        onSubscribe={initializePayment}
        loading={loadingPayment}
      />
    </div>
  )
}

export default CourseSelection