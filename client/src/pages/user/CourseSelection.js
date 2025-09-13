"use client"
import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import { useNotification } from "../../contexts/NotificationContext"
import ProgressRing from '../../components/ProgressRing'
import styles from "../../styles/course-selection.module.css"

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
  const [showDropdown, setShowDropdown] = useState({ show: false, type: null, options: [], courseCode: null })
  const [studyProgress, setStudyProgress] = useState({})
  const [fetchingQuestions, setFetchingQuestions] = useState(false)
  const [fetchingYears, setFetchingYears] = useState(false)
  const [fetchingTopics, setFetchingTopics] = useState(false)
  const [fetchingCourses, setFetchingCourses] = useState(false)
  
  // Get exam type from URL params
  const urlParams = new URLSearchParams(location.search)
  const examType = urlParams.get("type") || "study"
  const isMockMode = examType === "mock"
  
  // Refs for dropdown containers
  const dropdownRefs = useRef({})
  
  // Fetch study progress for all courses
  const loadAllStudyProgress = async () => {
    if (isMockMode) return;
    
    try {
      const response = await fetch("/api/questions/study-progress", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setStudyProgress(data.progress);
      } else {
        throw new Error(data.message || "Failed to load study progress");
      }
    } catch (error) {
      console.error("Failed to load study progress:", error);
      setStudyProgress({});
    }
  };
  
  const fetchCourses = async () => {
    setFetchingCourses(true)
    try {
      const response = await fetch("/api/courses", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }
      
      const data = await response.json()
      setCourses(data)
    } catch (error) {
      console.error("Failed to fetch courses:", error)
      setError("Failed to load courses. Please check your connection and try again.")
    } finally {
      setFetchingCourses(false)
    }
  }
  
  const fetchCourseYears = async () => {
    setFetchingYears(true)
    setError(null)
    try {
      const response = await fetch("/api/questions/course-years", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data || Object.keys(data).length === 0) {
        setError("No course data available. Please contact support.")
        return
      }
      
      setCourseYears(data)
    } catch (error) {
      console.error("Failed to fetch course years:", error)
      setError("Failed to load course data. Please check your connection and try again.")
    } finally {
      setFetchingYears(false)
      setLoading(false)
    }
  }
  
  const fetchTopics = async (courseCode) => {
    setFetchingTopics(true)
    try {
      const response = await fetch(`/api/questions/topics/${courseCode}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }
      
      const topics = await response.json()
      
      if (!topics || topics.length === 0) {
        showNotification(`No topics available for ${courseCode}. Please select another course.`, "error")
        handleCourseSelect(courseCode, false) // Deselect the course
        return
      }
      
      setCourseTopics((prev) => ({
        ...prev,
        [courseCode]: topics,
      }))
      // Initialize all topics as selected
      setSelectedTopics(new Set(topics))
    } catch (error) {
      console.error("Failed to fetch topics:", error)
      showNotification(`Failed to load topics for ${courseCode}. Please try again.`, "error")
      handleCourseSelect(courseCode, false) // Deselect the course
    } finally {
      setFetchingTopics(false)
    }
  }
  
// Updated handleCourseSelect function
const handleCourseSelect = (courseCode, isSelected) => {
  if (isSelected) {
    // If selecting a new course and another is already selected, deselect the previous one
    if (selectedCourse && selectedCourse !== courseCode) {
      // Clear the previous course's data
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
    
    // Check if there are any years available for this course
    if (!courseYears[courseCode] || courseYears[courseCode].length === 0) {
      showNotification(`No questions available for ${courseCode}. Please select another course.`, "error")
      return false;
    }
    
    setSelectedCourse(courseCode);
    fetchTopics(courseCode);
    
    // Initialize form data for this course
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
      delete newTopics[courseCode];
      return newTopics;
    });
    setSelectedTopics(new Set());
  }
  return true;
};
  
// Updated handleDropdownClick function
const handleDropdownClick = (courseCode, type) => {
  // Close any open dropdown first
  if (showDropdown.show && (showDropdown.courseCode !== courseCode || showDropdown.type !== type)) {
    setShowDropdown({ show: false, type: null, options: [], courseCode: null })
    // Use setTimeout to allow the dropdown to close before opening a new one
    setTimeout(() => {
      let options = []
      switch (type) {
        case "year":
          const years = courseYears[courseCode] || []
          if (years.length === 0) {
            showNotification(`No years available for ${courseCode}. Please select another course.`, "error")
            return
          }
          options = years.map((year) => ({ value: year, label: year }))
          break
        case "questions":
          options = [
            { value: "10", label: "10 Questions" },
            { value: "20", label: "20 Questions" },
            { value: "30", label: "30 Questions" },
            { value: "50", label: "50 Questions" },
            { value: "100", label: "100 Questions" },
          ]
          break
        case "time":
          options = [
            { value: "1", label: "1 minutes" },
            { value: "10", label: "10 minutes" },
            { value: "20", label: "20 minutes" },
            { value: "30", label: "30 minutes" },
            { value: "45", label: "45 minutes" },
            { value: "60", label: "60 minutes" },
            { value: "90", label: "90 minutes" },
            { value: "120", label: "120 minutes" },
          ]
          break
        case "topics":
          if (!courseTopics[courseCode] || courseTopics[courseCode].length === 0) {
            showNotification(`No topics available for ${courseCode}. Please select another course.`, "error")
            return
          }
          setCurrentTopicDropdown(courseCode)
          setShowTopicPopup(true)
          return
      }
      setShowDropdown({ show: true, type, options, courseCode })
    }, 200)
    return
  }
  
  // Toggle current dropdown
  if (showDropdown.show && showDropdown.courseCode === courseCode && showDropdown.type === type) {
    setShowDropdown({ show: false, type: null, options: [], courseCode: null })
    return
  }
  
  let options = []
  switch (type) {
    case "year":
      const years = courseYears[courseCode] || []
      if (years.length === 0) {
        showNotification(`No years available for ${courseCode}. Please select another course.`, "error")
        return
      }
      options = years.map((year) => ({ value: year, label: year }))
      break
    case "questions":
      options = [
        { value: "10", label: "10 Questions" },
        { value: "20", label: "20 Questions" },
        { value: "30", label: "30 Questions" },
        { value: "50", label: "50 Questions" },
        { value: "100", label: "100 Questions" },
      ]
      break
    case "time":
      options = [
    { value: "1", label: "1 minutes" },
            { value: "10", label: "10 minutes" },
            { value: "20", label: "20 minutes" },
            { value: "30", label: "30 minutes" },
            { value: "45", label: "45 minutes" },
            { value: "60", label: "60 minutes" },
            { value: "90", label: "90 minutes" },
            { value: "120", label: "120 minutes" },
      ]
      break
    case "topics":
      if (!courseTopics[courseCode] || courseTopics[courseCode].length === 0) {
        showNotification(`No topics available for ${courseCode}. Please select another course.`, "error")
        return
      }
      setCurrentTopicDropdown(courseCode)
      setShowTopicPopup(true)
      return
  }
  setShowDropdown({ show: true, type, options, courseCode })
}
  
  const handleOptionSelect = (courseCode, value, label) => {
    // Update form data with both value and label
    setFormData((prev) => ({
      ...prev,
      [courseCode]: {
        ...prev[courseCode],
        [showDropdown.type]: value,
        [`${showDropdown.type}Label`]: label,
      },
    }))
    
    // Close the dropdown
    setShowDropdown({ show: false, type: null, options: [], courseCode: null })
  }
  
  const handleTopicSelection = (topic, isSelected) => {
    setSelectedTopics((prev) => {
      const newSet = new Set(prev)
      if (isSelected) {
        newSet.add(topic)
      } else {
        newSet.delete(topic)
      }
      return newSet
    })
  }
  
  const handleTopicConfirm = () => {
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
  }
  
  const handleStartExam = async () => {
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
      const response = await fetch("/api/questions/fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(requestData),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || `Server responded with status: ${response.status}`)
      }
      
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch questions")
      }
      
      if (!data.questions || data.questions.length === 0) {
        throw new Error("No questions found for the selected criteria. Please try different options.")
      }
      
      // Store exam data
      localStorage.setItem(
        "currentExam",
        JSON.stringify({
          ...requestData,
          questions: data.questions,
          examType: examType,
        }),
      )
      // Navigate to appropriate page
      navigate(isMockMode ? "/mock" : "/study")
    } catch (error) {
      console.error("Failed to start exam:", error)
      showNotification(error.message || "Failed to start exam", "error")
    } finally {
      setFetchingQuestions(false)
    }
  }
  
  useEffect(() => {
    if (!user?.isSubscribed) {
      navigate("/home")
      return
    }
    fetchCourses()
    fetchCourseYears()
  }, [user, navigate])
  
  useEffect(() => {
    if (!fetchingYears && Object.keys(courseYears).length > 0 && !isMockMode) {
      loadAllStudyProgress()
    }
  }, [fetchingYears, courseYears, isMockMode])
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside any dropdown
      let clickedOutside = true;
      
      Object.keys(dropdownRefs.current).forEach(key => {
        if (dropdownRefs.current[key] && dropdownRefs.current[key].contains(event.target)) {
          clickedOutside = false;
        }
      });
      
      if (clickedOutside) {
        setShowDropdown({ show: false, type: null, options: [], courseCode: null })
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])
  
  // Filter courses based on search term
  const filteredCourses = (semesterCourses) => {
    if (!searchTerm) return semesterCourses
    return semesterCourses.filter(
      (course) =>
        course.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }
  
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
      {/* Continue Button */}
      <button 
        className={styles.startBtn} 
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
              className={`${styles.singleCourse} ${selectedCourse === course.courseCode ? styles.active : ""}`}
              ref={el => dropdownRefs.current[course.courseCode] = el}
            >
              <div className={styles.courseName} onClick={() => {
                const checkbox = document.getElementById(`checkbox-${course.courseCode}`)
                checkbox.checked = !checkbox.checked
                handleCourseSelect(course.courseCode, checkbox.checked)
              }}>
                <span className={styles.select}>
                  <input 
                    type="checkbox" 
                    id={`checkbox-${course.courseCode}`} 
                    checked={selectedCourse === course.courseCode} 
                    onChange={(e) => handleCourseSelect(course.courseCode, e.target.checked)} 
                  />
                </span>
                {course.courseCode.toUpperCase()} - {course.courseName}
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
                          <div className={styles.dropdownSelected} onClick={() => handleDropdownClick(course.courseCode, "year")}>
                            {formData[course.courseCode]?.yearLabel || "Select Year"}
                            <i className="fas fa-chevron-down"></i>
                          </div>
                          {showDropdown.show && showDropdown.type === "year" && showDropdown.courseCode === course.courseCode && (
                            <div className={`${styles.dropdownOptions} ${styles.show}`}>
                              {showDropdown.options.map((option) => {
                                const progressData = studyProgress[course.courseCode]?.[option.value] || {
                                  percentage: 0,
                                  studiedCount: 0,
                                  totalQuestions: 0
                                };
                                
                                return (
                                  <div
                                    key={option.value}
                                    className={styles.dropdownOption}
                                    onClick={() => handleOptionSelect(course.courseCode, option.value, option.label)}
                                  >
                                    <span>{option.label}</span>
                                    {!isMockMode && (
                                   <div className={styles.progressIndicator}>
  <ProgressRing percentage={progressData.percentage} radius={12} stroke={2} />
</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
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
                          <div className={styles.dropdownSelected} onClick={() => handleDropdownClick(course.courseCode, "questions")}>
                            {formData[course.courseCode]?.questionsLabel || "Select Questions"}
                            <i className="fas fa-chevron-down"></i>
                          </div>
                          {showDropdown.show && showDropdown.type === "questions" && showDropdown.courseCode === course.courseCode && (
                            <div className={`${styles.dropdownOptions} ${styles.show}`}>
                              {showDropdown.options.map((option) => (
                                <div
                                  key={option.value}
                                  className={styles.dropdownOption}
                                  onClick={() => handleOptionSelect(course.courseCode, option.value, option.label)}
                                >
                                  {option.label}
                                </div>
                              ))}
                            </div>
                          )}
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
                            <div className={styles.dropdownSelected} onClick={() => handleDropdownClick(course.courseCode, "time")}>
                              {formData[course.courseCode]?.timeLabel || "Select Time"}
                              <i className="fas fa-chevron-down"></i>
                            </div>
                            {showDropdown.show && showDropdown.type === "time" && showDropdown.courseCode === course.courseCode && (
                              <div className={`${styles.dropdownOptions} ${styles.show}`}>
                                {showDropdown.options.map((option) => (
                                  <div
                                    key={option.value}
                                    className={styles.dropdownOption}
                                    onClick={() => handleOptionSelect(course.courseCode, option.value, option.label)}
                                  >
                                    {option.label}
                                  </div>
                                ))}
                              </div>
                            )}
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
                        <div className={styles.dropdownSelected} onClick={() => handleDropdownClick(course.courseCode, "topics")}>
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
              className={`${styles.singleCourse} ${selectedCourse === course.courseCode ? styles.active : ""}`}
              ref={el => dropdownRefs.current[course.courseCode] = el}
            >
              <div className={styles.courseName} onClick={() => {
                const checkbox = document.getElementById(`checkbox-${course.courseCode}`)
                checkbox.checked = !checkbox.checked
                handleCourseSelect(course.courseCode, checkbox.checked)
              }}>
                <span className={styles.select}>
                  <input 
                    type="checkbox" 
                    id={`checkbox-${course.courseCode}`} 
                    checked={selectedCourse === course.courseCode} 
                    onChange={(e) => handleCourseSelect(course.courseCode, e.target.checked)} 
                  />
                </span>
                {course.courseCode.toUpperCase()} - {course.courseName}
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
                          <div className={styles.dropdownSelected} onClick={() => handleDropdownClick(course.courseCode, "year")}>
                            {formData[course.courseCode]?.yearLabel || "Select Year"}
                            <i className="fas fa-chevron-down"></i>
                          </div>
                          {showDropdown.show && showDropdown.type === "year" && showDropdown.courseCode === course.courseCode && (
                            <div className={`${styles.dropdownOptions} ${styles.show}`}>
                              {showDropdown.options.map((option) => {
                                const progressData = studyProgress[course.courseCode]?.[option.value] || {
                                  percentage: 0,
                                  studiedCount: 0,
                                  totalQuestions: 0
                                };
                                
                                return (
                                  <div
                                    key={option.value}
                                    className={styles.dropdownOption}
                                    onClick={() => handleOptionSelect(course.courseCode, option.value, option.label)}
                                  >
                                    <span>{option.label}</span>
                                    {!isMockMode && (
                                      <div className={styles.progressIndicator}>
                                        <ProgressRing percentage={progressData.percentage} />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
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
                          <div className={styles.dropdownSelected} onClick={() => handleDropdownClick(course.courseCode, "questions")}>
                            {formData[course.courseCode]?.questionsLabel || "Select Questions"}
                            <i className="fas fa-chevron-down"></i>
                          </div>
                          {showDropdown.show && showDropdown.type === "questions" && showDropdown.courseCode === course.courseCode && (
                            <div className={`${styles.dropdownOptions} ${styles.show}`}>
                              {showDropdown.options.map((option) => (
                                <div
                                  key={option.value}
                                  className={styles.dropdownOption}
                                  onClick={() => handleOptionSelect(course.courseCode, option.value, option.label)}
                                >
                                  {option.label}
                                </div>
                              ))}
                            </div>
                          )}
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
                            <div className={styles.dropdownSelected} onClick={() => handleDropdownClick(course.courseCode, "time")}>
                              {formData[course.courseCode]?.timeLabel || "Select Time"}
                              <i className="fas fa-chevron-down"></i>
                            </div>
                            {showDropdown.show && showDropdown.type === "time" && showDropdown.courseCode === course.courseCode && (
                              <div className={`${styles.dropdownOptions} ${styles.show}`}>
                                {showDropdown.options.map((option) => (
                                  <div
                                    key={option.value}
                                    className={styles.dropdownOption}
                                    onClick={() => handleOptionSelect(course.courseCode, option.value, option.label)}
                                  >
                                    {option.label}
                                  </div>
                                ))}
                              </div>
                            )}
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
                        <div className={styles.dropdownSelected} onClick={() => handleDropdownClick(course.courseCode, "topics")}>
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
    </div>
  )
}

export default CourseSelection