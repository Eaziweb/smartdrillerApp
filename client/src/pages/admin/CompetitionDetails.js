"use client"
import { useState, useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import axios from "axios"
import styles from "../../styles/AdminCompetitionDetails.module.css"

const CompetitionDetails = () => {
  const { id } = useParams()
  const [competition, setCompetition] = useState(null)
  const [stats, setStats] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const [selectedCourse, setSelectedCourse] = useState("")
  const [toast, setToast] = useState({ show: false, message: "", type: "" })
  
  // Modal states
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  
  // Form states
  const [courseForm, setCourseForm] = useState({
    courseCode: "",
    courseName: "",
    questionsToShow: 10,
    timeAllowed: 30,
  })
  
  const [questionForm, setQuestionForm] = useState({
    question: "",
    options: ["", "", "", ""],
    correctOption: 1,
    image: null,
    imagePreview: null,
  })
  
  const [bulkQuestions, setBulkQuestions] = useState("")
  const [competitionForm, setCompetitionForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    requiredCourses: 1,
    instructions: "",
    graceMinutes: 30,
    leaderboardDelay: 30,
  })

  // Initialize form with competition data
  useEffect(() => {
    if (competition) {
      setCompetitionForm({
        name: competition.name,
        description: competition.description,
        startDate: new Date(competition.startDate).toISOString().slice(0, 16),
        endDate: new Date(competition.endDate).toISOString().slice(0, 16),
        requiredCourses: competition.requiredCourses,
        instructions: competition.instructions,
        graceMinutes: competition.graceMinutes,
        leaderboardDelay: competition.leaderboardDelay,
      })
    }
  }, [competition])

  // Fetch competition data
  useEffect(() => {
    fetchCompetitionDetails()
    fetchStats()
  }, [id])

  // Set first course as default when competition loads
  useEffect(() => {
    if (competition && competition.courses && competition.courses.length > 0) {
      // Only set if no course is selected or if the selected course doesn't exist
      if (!selectedCourse || !competition.courses.some(c => c.courseCode === selectedCourse)) {
        setSelectedCourse(competition.courses[0].courseCode)
      }
    }
  }, [competition, selectedCourse])

  // Fetch questions when tab, selected course, or competition changes
  useEffect(() => {
    if (activeTab === "questions" && selectedCourse) {
      fetchQuestions()
    }
  }, [activeTab, selectedCourse, competition])

  const fetchCompetitionDetails = async () => {
    try {
      const response = await axios.get(`/api/admin/competitions/${id}`)
      setCompetition(response.data)
    } catch (error) {
      console.error("Error fetching competition:", error)
      showToast("Failed to fetch competition details", "error")
    }
  }

  const fetchStats = async () => {
    try {
      const response = await axios.get(`/api/admin/competitions/${id}/stats`)
      setStats(response.data)
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchQuestions = async () => {
    if (!selectedCourse) return
    
    try {
      setQuestionsLoading(true)
      const response = await axios.get(`/api/admin/competitions/${id}/questions?courseCode=${selectedCourse}`)
      setQuestions(response.data.questions || [])
    } catch (error) {
      console.error("Error fetching questions:", error)
      setQuestions([])
    } finally {
      setQuestionsLoading(false)
    }
  }

  // Competition management
  const handleUpdateCompetition = async (e) => {
    e.preventDefault()
    try {
      await axios.put(`/api/admin/competitions/${id}`, competitionForm)
      await fetchCompetitionDetails()
      showToast("Competition updated successfully", "success")
    } catch (error) {
      console.error("Error updating competition:", error)
      showToast(error.response?.data?.message || "Failed to update competition", "error")
    }
  }

  // Course management
  const handleAddCourse = async (e) => {
    e.preventDefault()
    try {
      const response = await axios.post(`/api/admin/competitions/${id}/courses`, courseForm)
      
      setCompetition(prev => ({
        ...prev,
        courses: [...(prev.courses || []), response.data.course]
      }))
      
      // Set newly added course as selected
      setSelectedCourse(response.data.course.courseCode)
      
      setShowCourseModal(false)
      resetCourseForm()
      showToast("Course added successfully", "success")
    } catch (error) {
      console.error("Error adding course:", error)
      showToast(error.response?.data?.message || "Failed to add course", "error")
    }
  }

  const handleRemoveCourse = async (courseCode) => {
    if (!window.confirm("Are you sure you want to remove this course? All questions for this course will also be deleted.")) return
    
    try {
      await axios.delete(`/api/admin/competitions/${id}/courses/${courseCode}`)
      
      setCompetition(prev => ({
        ...prev,
        courses: prev.courses.filter(c => c.courseCode !== courseCode)
      }))
      
      // Reset selected course if it was removed
      if (selectedCourse === courseCode) {
        const remainingCourses = competition.courses.filter(c => c.courseCode !== courseCode)
        if (remainingCourses.length > 0) {
          setSelectedCourse(remainingCourses[0].courseCode)
        } else {
          setSelectedCourse("")
        }
      }
      
      showToast("Course removed successfully", "success")
    } catch (error) {
      console.error("Error removing course:", error)
      showToast("Failed to remove course", "error")
    }
  }

  // Question management
  const handleAddQuestion = async (e) => {
    e.preventDefault()
    
    // Validate correctOption is within the range of options
    if (questionForm.correctOption < 1 || questionForm.correctOption > questionForm.options.length) {
      showToast("Correct option must be between 1 and the number of options", "error")
      return
    }
    
    try {
      const formData = new FormData()
      formData.append("question", questionForm.question)
      formData.append("options", JSON.stringify(questionForm.options))
      formData.append("correctOption", questionForm.correctOption)
      formData.append("courseCode", selectedCourse)
      
      if (questionForm.image) {
        formData.append("image", questionForm.image)
      }
      
      await axios.post(`/api/admin/competitions/${id}/questions`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      
      setShowQuestionModal(false)
      resetQuestionForm()
      fetchQuestions()
      fetchCompetitionDetails() // Update course question count
      showToast("Question added successfully", "success")
    } catch (error) {
      console.error("Error adding question:", error)
      showToast(error.response?.data?.message || "Failed to add question", "error")
    }
  }

  const handleUpdateQuestion = async (questionId) => {
    try {
      const question = questions.find(q => q._id === questionId)
      if (!question) return
      
      // Validate correctOption is within the range of options
      if (question.correctOption < 1 || question.correctOption > question.options.length) {
        showToast("Correct option must be between 1 and the number of options", "error")
        return
      }
      
      const formData = new FormData()
      formData.append("question", question.question)
      formData.append("options", JSON.stringify(question.options))
      formData.append("correctOption", question.correctOption)
      
      if (question.imageFile) {
        formData.append("image", question.imageFile)
      }
      
      await axios.put(`/api/admin/competitions/${id}/questions/${questionId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      
      fetchQuestions()
      showToast("Question updated successfully", "success")
    } catch (error) {
      console.error("Error updating question:", error)
      showToast(error.response?.data?.message || "Failed to update question", "error")
    }
  }

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return
    
    try {
      await axios.delete(`/api/admin/competitions/${id}/questions/${questionId}`)
      fetchQuestions()
      fetchCompetitionDetails() // Update course question count
      showToast("Question deleted successfully", "success")
    } catch (error) {
      console.error("Error deleting question:", error)
      showToast(error.response?.data?.message || "Failed to delete question", "error")
    }
  }

const handleBulkImport = async (e) => {
  e.preventDefault();
  try {
    let questions;

    try {
      // First escape all single backslashes → double backslashes
      const escaped = bulkQuestions.trim().replace(/\\/g, "\\\\");
      questions = JSON.parse(escaped);
    } catch (parseError) {
      showToast(`Invalid JSON format: ${parseError.message}`, "error");
      return;
    }

    if (!Array.isArray(questions)) {
      showToast("Questions data must be an array.", "error");
      return;
    }

    // Validate each question has required fields
    const requiredFields = ["question", "options", "correctOption"];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      for (const field of requiredFields) {
        if (!q[field]) {
          showToast(`Question ${i + 1}: Missing '${field}' field.`, "error");
          return;
        }
      }
    }

    const response = await axios.post(
      `/api/admin/competitions/${id}/questions/bulk`,
      {
        questions,
        courseCode: selectedCourse,
      }
    );

    setShowBulkModal(false);
    setBulkQuestions("");
    fetchQuestions();
    fetchCompetitionDetails(); // Update course question count
    showToast(
      `${response.data.questions.length} questions imported successfully`,
      "success"
    );
  } catch (error) {
    console.error("Error importing questions:", error);
    if (error.response?.data?.errors) {
      showToast(
        `Validation errors: ${error.response.data.errors.join(", ")}`,
        "error"
      );
    } else {
      showToast(
        error.response?.data?.message ||
          "Failed to import questions. Check JSON format.",
        "error"
      );
    }
  }
};


  // Form handlers
  const handleCompetitionChange = (e) => {
    const { name, value } = e.target
    setCompetitionForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCourseChange = (e) => {
    const { name, value } = e.target
    setCourseForm(prev => ({
      ...prev,
      [name]: name === "questionsToShow" || name === "timeAllowed" ? parseInt(value) : value
    }))
  }

  const handleOptionChange = (index, value) => {
    const newOptions = [...questionForm.options]
    newOptions[index] = value
    setQuestionForm(prev => ({
      ...prev,
      options: newOptions
    }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const previewUrl = URL.createObjectURL(file)
      setQuestionForm(prev => ({
        ...prev,
        image: file,
        imagePreview: previewUrl
      }))
    } else {
      setQuestionForm(prev => ({
        ...prev,
        image: null,
        imagePreview: null
      }))
    }
  }

  const handleQuestionEdit = (questionId, field, value) => {
    setQuestions(prev => 
      prev.map(q => 
        q._id === questionId ? { ...q, [field]: value } : q
      )
    )
  }

  const handleQuestionImageChange = (questionId, e) => {
    const file = e.target.files[0]
    if (file) {
      setQuestions(prev => 
        prev.map(q => 
          q._id === questionId ? { ...q, imageFile: file, imagePreview: URL.createObjectURL(file) } : q
        )
      )
    }
  }

  // Reset forms
  const resetCourseForm = () => {
    setCourseForm({
      courseCode: "",
      courseName: "",
      questionsToShow: 10,
      timeAllowed: 30,
    })
  }

  const resetQuestionForm = () => {
    if (questionForm.imagePreview) {
      URL.revokeObjectURL(questionForm.imagePreview)
    }
    setQuestionForm({
      question: "",
      options: ["", "", "", ""],
      correctOption: 1,
      image: null,
      imagePreview: null,
    })
  }

  // Close modals and clean up
  const closeQuestionModal = () => {
    if (questionForm.imagePreview) {
      URL.revokeObjectURL(questionForm.imagePreview)
    }
    setShowQuestionModal(false)
    resetQuestionForm()
  }

  // Toast notification
  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000)
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading competition details...</p>
      </div>
    )
  }

  if (!competition) {
    return (
      <div className={styles.errorContainer}>
        <h3>Competition not found</h3>
        <Link to="/admin/competitions" className={`${styles.btn} ${styles.btnPrimary}`}>
          Back to Competitions
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.adminPage}>
      {/* Toast notification */}
      {toast.show && (
        <div className={`${styles.messageToast} ${styles[toast.type]}`}>
          <i className={`fas ${toast.type === "success" ? "fa-check-circle" : toast.type === "error" ? "fa-exclamation-triangle" : "fa-info-circle"}`}></i>
          <span>{toast.message}</span>
        </div>
      )}

      <div className={styles.adminHeader}>
        <Link to="/admin/competitions" className={styles.backBtn}>
          <i className="fas fa-arrow-left"></i>
        </Link>
        <div className={styles.headerContent}>
          <h1>{competition.name}</h1>
          <span className={`${styles.statusBadge} ${styles[`status${competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}`]}`}>
            {competition.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className={styles.adminContent}>
        {/* Competition Stats */}
        <div className={styles.competitionStats}>
          <div className={styles.statCard}>
            <i className="fas fa-users"></i>
            <div>
              <h3>{stats?.totalSubmissions || 0}</h3>
              <p>Participants</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-question-circle"></i>
            <div>
              <h3>{stats?.totalQuestions || 0}</h3>
              <p>Total Questions</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-book"></i>
            <div>
              <h3>{competition.courses?.length || 0}</h3>
              <p>Courses</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-clock"></i>
            <div>
              <h3>{competition.requiredCourses}</h3>
              <p>Required Courses</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabNavigation}>
          <button
            className={`${styles.tabBtn} ${activeTab === "details" ? styles.active : ""}`}
            onClick={() => setActiveTab("details")}
          >
            <i className="fas fa-info-circle"></i>
            Details
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "courses" ? styles.active : ""}`}
            onClick={() => setActiveTab("courses")}
          >
            <i className="fas fa-book"></i>
            Courses
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "questions" ? styles.active : ""}`}
            onClick={() => setActiveTab("questions")}
          >
            <i className="fas fa-question-circle"></i>
            Questions
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "details" && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h3>Competition Details</h3>
            </div>
            <form onSubmit={handleUpdateCompetition} className={styles.competitionForm}>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label>Competition Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={competitionForm.name}
                    onChange={handleCompetitionChange}
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Required Courses *</label>
                  <input
                    type="number"
                    name="requiredCourses"
                    value={competitionForm.requiredCourses}
                    onChange={handleCompetitionChange}
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <div className={styles.inputGroup}>
                <label>Description *</label>
                <textarea
                  name="description"
                  value={competitionForm.description}
                  onChange={handleCompetitionChange}
                  required
                  rows="3"
                />
              </div>
              
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label>Start Date *</label>
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={competitionForm.startDate}
                    onChange={handleCompetitionChange}
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>End Date *</label>
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={competitionForm.endDate}
                    onChange={handleCompetitionChange}
                    required
                  />
                </div>
              </div>
              
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label>Grace Period (minutes)</label>
                  <input
                    type="number"
                    name="graceMinutes"
                    value={competitionForm.graceMinutes}
                    onChange={handleCompetitionChange}
                    min="0"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Leaderboard Delay (minutes)</label>
                  <input
                    type="number"
                    name="leaderboardDelay"
                    value={competitionForm.leaderboardDelay}
                    onChange={handleCompetitionChange}
                    min="0"
                  />
                </div>
              </div>
              
              <div className={styles.inputGroup}>
                <label>Instructions</label>
                <textarea
                  name="instructions"
                  value={competitionForm.instructions}
                  onChange={handleCompetitionChange}
                  rows="4"
                />
              </div>
              
              <div className={styles.formActions}>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  <i className="fas fa-save"></i> Update Competition
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "courses" && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h3>Course Management</h3>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowCourseModal(true)}>
                <i className="fas fa-plus"></i>
                Add Course
              </button>
            </div>
            
            <div className={styles.coursesGrid}>
              {competition.courses?.map((course) => (
                <div key={course.courseCode} className={styles.courseCard}>
                  <div className={styles.courseHeader}>
                    <h4>{course.courseCode}</h4>
                    <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => handleRemoveCourse(course.courseCode)}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                  <p>{course.courseName}</p>
                  <div className={styles.courseDetails}>
                    <span>Questions to show: {course.questionsToShow}</span>
                    <span>Time allowed: {course.timeAllowed} min</span>
                    <span>Questions: {course.questionsCount || 0}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {(!competition.courses || competition.courses.length === 0) && (
              <div className={styles.emptyState}>
                <i className="fas fa-book"></i>
                <h3>No courses added</h3>
                <p>Add courses to this competition</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "questions" && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h3>Question Management</h3>
              <div className={styles.headerActions}>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className={styles.courseSelector}
                >
                  <option value="">Select a course</option>
                  {competition.courses?.map((course) => (
                    <option key={course.courseCode} value={course.courseCode}>
                      {course.courseCode} - {course.courseName} ({course.questionsCount || 0} questions)
                    </option>
                  ))}
                </select>
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowBulkModal(true)} disabled={!selectedCourse}>
                  <i className="fas fa-upload"></i>
                  Bulk Import
                </button>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => setShowQuestionModal(true)}
                  disabled={!selectedCourse}
                >
                  <i className="fas fa-plus"></i>
                  Add Question
                </button>
              </div>
            </div>
            
            {!selectedCourse && (
              <div className={styles.infoMessage}>
                <i className="fas fa-info-circle"></i>
                <p>Select a course to view and manage questions</p>
              </div>
            )}
            
            {selectedCourse && (
              <div className={styles.questionsList}>
                {questionsLoading ? (
                  <div className={styles.loadingQuestions}>
                    <div className={styles.spinner}></div>
                    <p>Loading questions...</p>
                  </div>
                ) : questions.length > 0 ? (
                  questions.map((question, index) => (
                    <div key={question._id} className={styles.questionCard}>
                      <div className={styles.questionHeader}>
                        <span className={styles.questionNumber}>Q{index + 1}</span>
                        <div className={styles.questionActions}>
                          <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => handleUpdateQuestion(question._id)}>
                            <i className="fas fa-save"></i>
                          </button>
                          <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => handleDeleteQuestion(question._id)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                      
                      <div className={styles.questionContent}>
                        <textarea
                          value={question.question}
                          onChange={(e) => handleQuestionEdit(question._id, "question", e.target.value)}
                          rows="2"
                          className={styles.questionTextarea}
                          placeholder="Enter question text"
                        />
                        
                        {/* Question image */}
                        {(question.image || question.imagePreview) && (
                          <div className={styles.questionImageContainer}>
                            <img 
                              src={question.imagePreview || question.image} 
                              alt="Question" 
                              className={styles.questionImage} 
                            />
                            <div className={styles.imageActions}>
                              <label className={`${styles.btn} ${styles.btnSm} ${styles.btnOutline}`}>
                                Change Image
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={(e) => handleQuestionImageChange(question._id, e)} 
                                  style={{ display: 'none' }} 
                                />
                              </label>
                              <button 
                                className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`} 
                                onClick={() => handleQuestionEdit(question._id, "image", "")}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Question options */}
                        <div className={styles.questionOptions}>
                          {question.options.map((option, optIndex) => (
                            <div key={optIndex} className={styles.optionInputGroup}>
                              <span className={styles.optionLabel}>{String.fromCharCode(65 + optIndex)}</span>
                              <textarea
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...question.options]
                                  newOptions[optIndex] = e.target.value
                                  handleQuestionEdit(question._id, "options", newOptions)
                                }}
                                rows="1"
                                className={styles.optionTextarea}
                                placeholder={`Option ${optIndex + 1}`}
                              />
                              {question.correctOption === optIndex + 1 && (
                                <i className={`fas fa-check ${styles.correctIndicator}`}></i>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* Correct option selector */}
                        <div className={styles.questionMeta}>
                          <select
                            value={question.correctOption}
                            onChange={(e) => handleQuestionEdit(question._id, "correctOption", parseInt(e.target.value))}
                            className={styles.correctOptionSelect}
                          >
                            {question.options.map((_, i) => (
                              <option key={i} value={i + 1}>
                                Correct: {String.fromCharCode(65 + i)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    <i className="fas fa-question-circle"></i>
                    <h3>No questions found</h3>
                    <p>Add questions to this course</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Course Modal */}
      {showCourseModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Add Course</h3>
              <button className={styles.closeBtn} onClick={() => setShowCourseModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleAddCourse}>
              <div className={styles.modalBody}>
                <div className={styles.inputGroup}>
                  <label>Course Code *</label>
                  <input
                    type="text"
                    name="courseCode"
                    value={courseForm.courseCode}
                    onChange={handleCourseChange}
                    required
                    placeholder="e.g., BIO102"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Course Name *</label>
                  <input
                    type="text"
                    name="courseName"
                    value={courseForm.courseName}
                    onChange={handleCourseChange}
                    required
                    placeholder="e.g., General Biology"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Questions to Show *</label>
                  <input
                    type="number"
                    name="questionsToShow"
                    value={courseForm.questionsToShow}
                    onChange={handleCourseChange}
                    min="1"
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Time Allowed (minutes) *</label>
                  <input
                    type="number"
                    name="timeAllowed"
                    value={courseForm.timeAllowed}
                    onChange={handleCourseChange}
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowCourseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  Add Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {showQuestionModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} ${styles.modalLg}`}>
            <div className={styles.modalHeader}>
              <h3>Add Question to {selectedCourse}</h3>
              <button className={styles.closeBtn} onClick={closeQuestionModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleAddQuestion}>
              <div className={styles.modalBody}>
                {/* Image preview */}
                {questionForm.imagePreview && (
                  <div className={styles.imagePreview}>
                    <img src={questionForm.imagePreview} alt="Preview" />
                    <button 
                      type="button" 
                      className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`}
                      onClick={() => setQuestionForm(prev => ({ ...prev, image: null, imagePreview: null }))}
                    >
                      Remove Image
                    </button>
                  </div>
                )}
                
                <div className={styles.inputGroup}>
                  <label>Question *</label>
                  <textarea
                    name="question"
                    value={questionForm.question}
                    onChange={(e) => setQuestionForm(prev => ({ ...prev, question: e.target.value }))}
                    required
                    rows="3"
                    placeholder="Enter question text"
                  />
                </div>
                
                <div className={styles.inputGroup}>
                  <label>Options *</label>
                  {questionForm.options.map((option, index) => (
                    <div key={index} className={styles.optionInputGroup}>
                      <span className={styles.optionLabel}>{String.fromCharCode(65 + index)}</span>
                      <textarea
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        rows="1"
                        placeholder={`Option ${index + 1}`}
                        required
                      />
                    </div>
                  ))}
                </div>
                
                <div className={styles.inputGroup}>
                  <label>Correct Option *</label>
                  <select
                    name="correctOption"
                    value={questionForm.correctOption}
                    onChange={(e) => setQuestionForm(prev => ({ ...prev, correctOption: parseInt(e.target.value) }))}
                    required
                  >
                    {questionForm.options.map((_, i) => (
                      <option key={i} value={i + 1}>
                        {String.fromCharCode(65 + i)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.inputGroup}>
                  <label>Image (Optional)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange} 
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeQuestionModal}>
                  Cancel
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  Add Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} ${styles.modalLg}`}>
            <div className={styles.modalHeader}>
              <h3>Bulk Import Questions for {selectedCourse}</h3>
              <button className={styles.closeBtn} onClick={() => setShowBulkModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleBulkImport}>
              <div className={styles.modalBody}>
                <div className={styles.inputGroup}>
                  <label>Questions JSON *</label>
                  <textarea
                    value={bulkQuestions}
                    onChange={(e) => setBulkQuestions(e.target.value)}
                    required
                    rows="15"
                    placeholder={`Paste JSON array of questions here. Format:
[
  {
    "question": "The study of bacteria is known as?",
    "options": ["Virology", "Microbiology", "Bacteriology", "Mycology"],
    "correctOption": 3,
    "image": "optional_image_url"
  }
]`}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowBulkModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  Import Questions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompetitionDetails