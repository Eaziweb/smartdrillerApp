"use client"
import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/AdminQuizManagement.module.css"
import api from "../../utils/api"

const AdminQuizManagement = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("questions")
  const [questions, setQuestions] = useState([])
  const [courseYears, setCourseYears] = useState({})
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    course: "",
    year: "",
    topic: "",
  })
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [bulkImportProgress, setBulkImportProgress] = useState({
    loading: false,
    progress: 0,
    message: "",
    error: false
  })
  
  // Form states
  const [questionForm, setQuestionForm] = useState({
    question: "",
    options: ["", ""],
    correctOption: 1,
    explanation: "",
    tags: "",
    course: "",
    year: "",
    topic: "",
    image: null,
    imagePreview: null,
  })
  
  const [courseYearForm, setCourseYearForm] = useState({
    course: "",
    year: "",
  })
  
  const [courseForm, setCourseForm] = useState({
    courseCode: "",
    courseName: "",
    semester: "first",
  })
  
  const [bulkImportData, setBulkImportData] = useState("")
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [editingCourse, setEditingCourse] = useState(null)
  
  // Statistics state
  const [statistics, setStatistics] = useState({
    totalQuestions: 0,
    courseStats: [],
    yearStats: [],
    topicStats: []
  })
  
  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: "",
    onConfirm: null,
  })
  
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  })
  
  // Fetch initial data
  useEffect(() => {
    fetchQuestions()
    fetchCourseYears()
    fetchCourses()
    fetchStatistics()
  }, [])
  
  // Data fetching functions
  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await api.get("/api/courses/admin", {
        headers: { Authorization: `Bearer ${token}` },
      })
      setCourses(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error("Error fetching courses:", error)
      setCourses([])
    }
  }
  
  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const queryParams = new URLSearchParams({
        q: searchTerm,
        ...filters,
      }).toString()
      
      const response = await api.get(`/api/questions/admin/search?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      setQuestions(response.data.questions || [])
    } catch (error) {
      console.error("Error fetching questions:", error)
      showToast("Failed to fetch questions", "error")
    }
    setLoading(false)
  }
  
  const fetchCourseYears = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await api.get("/api/courseYears/admin", {
        headers: { Authorization: `Bearer ${token}` },
      })
      setCourseYears(response.data.courseYears || {})
    } catch (error) {
      console.error("Error fetching course years:", error)
    }
  }
  
  const fetchStatistics = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await api.get("/api/questions/statistics", {
        headers: { Authorization: `Bearer ${token}` },
      })
      setStatistics(response.data)
    } catch (error) {
      console.error("Error fetching statistics:", error)
      showToast("Failed to fetch statistics", "error")
    } finally {
      setLoading(false)
    }
  }
  
  // Utility functions
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000)
  }
  
  
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.match('image.*')) {
        showToast("Please select an image file", "error")
        return
      }
      
      if (file.size > 5 * 1024 * 1024) {
        showToast("Image size should be less than 5MB", "error")
        return
      }
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setQuestionForm({
          ...questionForm,
          image: file,
          imagePreview: reader.result,
        })
      }
      reader.readAsDataURL(file)
    }
  }
  
  const removeImage = () => {
    setQuestionForm({
      ...questionForm,
      image: null,
      imagePreview: null,
    })
  }
  const addOption = () => {
    if (questionForm.options.length < 4) {
      setQuestionForm({
        ...questionForm,
        options: [...questionForm.options, ""]
      })
    }
  }
  
  const removeOption = (index) => {
    if (questionForm.options.length > 2) {
      const newOptions = [...questionForm.options]
      newOptions.splice(index, 1)
      
      let newCorrectOption = questionForm.correctOption
      if (newCorrectOption > newOptions.length) {
        newCorrectOption = newOptions.length
      } else if (newCorrectOption === index + 1) {
        newCorrectOption = 1
      }
      
      setQuestionForm({
        ...questionForm,
        options: newOptions,
        correctOption: newCorrectOption
      })
    }
  }
  
  // Form handlers
  const handleAddQuestion = async (e) => {
    e.preventDefault()
    
    if (questionForm.correctOption < 1 || questionForm.correctOption > questionForm.options.length) {
      showToast(`Correct option must be between 1 and ${questionForm.options.length}`, "error")
      return
    }
    
    const formData = new FormData()
    formData.append("question", questionForm.question)
    questionForm.options.forEach((option, index) => {
      formData.append(`options[${index}]`, option)
    })
    formData.append("correctOption", questionForm.correctOption)
    formData.append("explanation", questionForm.explanation)
    formData.append("course", questionForm.course)
    formData.append("year", questionForm.year)
    formData.append("topic", questionForm.topic)
    
    const tags = questionForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
    tags.forEach((tag, index) => {
      formData.append(`tags[${index}]`, tag)
    })
    
    if (questionForm.image) {
      formData.append("image", questionForm.image)
    }
    
    try {
      const token = localStorage.getItem("token")
      const response = await api.post("/api/questions/admin/add", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      })
      
      showToast(response.data.message || "Question added successfully")
      resetQuestionForm()
      fetchQuestions()
      fetchCourseYears()
      fetchStatistics()
    } catch (error) {
      console.error("Error adding question:", error)
      showToast(error.response?.data?.message || "Failed to add question", "error")
    }
  }
  
  const handleUpdateQuestion = async (e) => {
    e.preventDefault()
    
    if (questionForm.correctOption < 1 || questionForm.correctOption > questionForm.options.length) {
      showToast(`Correct option must be between 1 and ${questionForm.options.length}`, "error")
      return
    }
    
    const formData = new FormData()
    formData.append("question", questionForm.question)
    questionForm.options.forEach((option, index) => {
      formData.append(`options[${index}]`, option)
    })
    formData.append("correctOption", questionForm.correctOption)
    formData.append("explanation", questionForm.explanation)
    formData.append("course", questionForm.course)
    formData.append("year", questionForm.year)
    formData.append("topic", questionForm.topic)
    
    const tags = questionForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
    tags.forEach((tag, index) => {
      formData.append(`tags[${index}]`, tag)
    })
    
    if (questionForm.image) {
      formData.append("image", questionForm.image)
    }
    
    try {
      const token = localStorage.getItem("token")
      const response = await api.put(`/api/questions/admin/${editingQuestion._id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      })
      
      showToast("Question updated successfully")
      setEditingQuestion(null)
      resetQuestionForm()
      fetchQuestions()
      fetchStatistics()
    } catch (error) {
      console.error("Error updating question:", error)
      showToast(error.response?.data?.message || "Failed to update question", "error")
    }
  }
  
  const handleAddCourseYear = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem("token")
      const response = await api.post("/api/courseYears/admin/add", courseYearForm, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      
      showToast("Course year added successfully")
      setCourseYearForm({ course: "", year: "" })
      fetchCourseYears()
    } catch (error) {
      console.error("Error adding course year:", error)
      showToast(error.response?.data?.message || "Failed to add course year", "error")
    }
  }
  
  const handleAddCourse = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem("token")
      const response = await api.post("/api/courses/admin/add", courseForm, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      
      showToast(response.data.message)
      resetCourseForm()
      fetchCourses()
    } catch (error) {
      console.error("Error adding course:", error)
      showToast(error.response?.data?.message || "Failed to add course", "error")
    }
  }
  
  const handleUpdateCourse = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem("token")
      const response = await api.put(`/api/courses/admin/${editingCourse._id}`, courseForm, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      
      showToast("Course updated successfully")
      setEditingCourse(null)
      resetCourseForm()
      fetchCourses()
    } catch (error) {
      console.error("Error updating course:", error)
      showToast(error.response?.data?.message || "Failed to update course", "error")
    }
  }
  
  const handleBulkImport = async (e) => {
    e.preventDefault()
    setBulkImportProgress({
      loading: true,
      progress: 0,
      message: "Validating questions...",
      error: false
    })
    
    try {
      const tryParse = (data) => {
        try {
          const escaped = data.replace(/\\/g, '\\\\')
          return JSON.parse(escaped)
        } catch (err) {
          return null
        }
      }
      
      setBulkImportProgress(prev => ({...prev, message: "Parsing JSON data..."}))
      let parsedQuestions = tryParse(bulkImportData)
      
      if (!parsedQuestions || !Array.isArray(parsedQuestions)) {
        setBulkImportProgress({
          loading: false,
          progress: 0,
          message: "",
          error: true
        })
        showToast("Invalid JSON format. Must be an array of questions.", "error")
        return
      }
      
      const expectedCount = parsedQuestions.length
      setBulkImportProgress(prev => ({...prev, message: `Validating ${expectedCount} questions...`}))
      
      const validatedQuestions = parsedQuestions.map((q, index) => {
        const progress = Math.round((index / parsedQuestions.length) * 40)
        setBulkImportProgress(prev => ({...prev, progress}))
        
        if (!q.question || !q.options || q.correctOption === undefined || 
            !q.explanation || !q.course || !q.year || !q.topic) {
          throw new Error(`Question ${index + 1}: Missing required fields`)
        }
        
        if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4) {
          throw new Error(`Question ${index + 1}: Must have between 2 and 4 options`)
        }
        
        const correctOption = Number(q.correctOption)
        if (isNaN(correctOption) || correctOption < 1 || correctOption > q.options.length) {
          throw new Error(`Question ${index + 1}: Correct option must be between 1 and ${q.options.length}`)
        }
        
        return { ...q, correctOption: correctOption }
      })
      
      setBulkImportProgress(prev => ({...prev, message: "Sending questions to server...", progress: 50}))
      
      const token = localStorage.getItem("token")
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000)
      
      try {
        const response = await api.post("/api/questions/admin/bulk-import", { questions: validatedQuestions }, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 40) + 50
            setBulkImportProgress(prev => ({...prev, progress, message: "Uploading questions..."}))
          }
        })
        
        clearTimeout(timeoutId)
        const { imported } = response.data
        if (imported !== expectedCount) {
          throw new Error(`Import incomplete. Expected ${expectedCount} questions, but only ${imported} were imported.`)
        }
        
        setBulkImportProgress(prev => ({...prev, progress: 100, message: "Import complete!"}))
        showToast(response.data.message)
        setBulkImportData("")
        fetchQuestions()
        fetchCourseYears()
        fetchStatistics()
      } catch (error) {
        clearTimeout(timeoutId)
        
        if (error.name === 'AbortError') {
          showToast("Import timed out. Please try again with a smaller batch.", "error")
          handleCleanupPending()
        } else {
          throw error
        }
      }
    } catch (error) {
      console.error("Error importing questions:", error)
      setBulkImportProgress({
        loading: false,
        progress: 0,
        message: "",
        error: true
      })
      showToast(`Import failed: ${error.message}`, "error")
    } finally {
      setTimeout(() => {
        setBulkImportProgress(prev => ({...prev, loading: false, progress: 0}))
      }, 2000)
    }
  }
  
  const handleCleanupPending = async () => {
    setCleanupLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await api.post("/api/questions/admin/cleanup-pending", {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      showToast(response.data.message)
      fetchQuestions()
      fetchStatistics()
    } catch (error) {
      console.error("Error cleaning up pending questions:", error)
      showToast(error.response?.data?.message || "Failed to clean up pending questions", "error")
    } finally {
      setCleanupLoading(false)
    }
  }
  
  // Delete handlers
  const deleteQuestion = async (questionId) => {
    try {
      const token = localStorage.getItem("token")
      await api.delete(`/api/questions/admin/${questionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      showToast("Question deleted successfully")
      fetchQuestions()
      fetchStatistics()
    } catch (error) {
      console.error("Error deleting question:", error)
      showToast("Failed to delete question", "error")
    }
  }
  
  const deleteCourseYear = async (courseYearId) => {
    try {
      const token = localStorage.getItem("token")
      await api.delete(`/api/courseYears/admin/${courseYearId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      showToast("Course year deleted successfully")
      fetchCourseYears()
    } catch (error) {
      console.error("Error deleting course year:", error)
      showToast("Failed to delete course year", "error")
    }
  }
  
  const toggleCourseStatus = async (courseId, currentStatus) => {
    try {
      const token = localStorage.getItem("token")
      const response = await api.put(`/api/courses/admin/${courseId}`, { isActive: !currentStatus }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      showToast(`Course ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      fetchCourses()
    } catch (error) {
      console.error(`Error ${!currentStatus ? 'activating' : 'deactivating'} course:`, error)
      showToast(`Failed to ${!currentStatus ? 'activate' : 'deactivate'} course`, "error")
    }
  }
  
  const handleDeactivateSemester = async (semester) => {
    try {
      const token = localStorage.getItem("token")
      const response = await api.post("/api/courses/admin/deactivate-semester", { semester }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      showToast(response.data.message)
      fetchCourses()
    } catch (error) {
      console.error("Error deactivating semester:", error)
      showToast("Failed to deactivate semester", "error")
    }
  }
  
  // Edit handlers
  const startEditQuestion = (question) => {
    setEditingQuestion(question)
    setQuestionForm({
      question: question.question,
      options: [...question.options],
      correctOption: question.correctOption,
      explanation: question.explanation,
      tags: question.tags.join(", "),
      course: question.course,
      year: question.year,
      topic: question.topic,
      image: null,
      imagePreview: question.image || null,
    })
  }
  
  const startEditCourse = (course) => {
    setEditingCourse(course)
    setCourseForm({
      courseCode: course.courseCode,
      courseName: course.courseName,
      semester: course.semester,
    })
  }
  
  // Reset form functions
  const resetQuestionForm = () => {
    setQuestionForm({
      question: "",
      options: ["", ""],
      correctOption: 1,
      explanation: "",
      tags: "",
      course: "",
      year: "",
      topic: "",
      image: null,
      imagePreview: null,
    })
  }
  
  const resetCourseForm = () => {
    setCourseForm({
      courseCode: "",
      courseName: "",
      semester: "first",
    })
  }
  
  const cancelEdit = () => {
    setEditingQuestion(null)
    resetQuestionForm()
  }
  
  const cancelEditCourse = () => {
    setEditingCourse(null)
    resetCourseForm()
  }
  
  // Confirmation dialog handlers
  const handleDeleteQuestion = (questionId) => {
    setConfirmDialog({
      isOpen: true,
      message: "Are you sure you want to delete this question?",
      onConfirm: () => deleteQuestion(questionId),
    })
  }
  
  const handleDeleteCourseYear = (courseYearId) => {
    setConfirmDialog({
      isOpen: true,
      message: "Are you sure you want to delete this course year?",
      onConfirm: () => deleteCourseYear(courseYearId),
    })
  }
  
  const handleToggleCourseStatus = (courseId, currentStatus) => {
    setConfirmDialog({
      isOpen: true,
      message: `Are you sure you want to ${!currentStatus ? 'activate' : 'deactivate'} this course?`,
      onConfirm: () => toggleCourseStatus(courseId, currentStatus),
    })
  }
  
  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, message: "", onConfirm: null })
  }
  
  return (
    <div className={styles.adminDashboard}>
      {/* Toast Notification */}
      {toast.show && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
          <span>{toast.message}</span>
        </div>
      )}
      
      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className={styles.confirmDialogOverlay}>
          <div className={styles.confirmDialog}>
            <p>{confirmDialog.message}</p>
            <div className={styles.confirmDialogButtons}>
              <button
                className={`${styles.btn} ${styles.btnConfirm}`}
                onClick={() => {
                  if (confirmDialog.onConfirm) confirmDialog.onConfirm()
                  closeConfirmDialog()
                }}
              >
                Yes
              </button>
              <button className={`${styles.btn} ${styles.btnCancel}`} onClick={closeConfirmDialog}>
                No
              </button>
            </div>
          </div>
        </div>
      )}
      
      <header className={styles.adminHeader}>
        <h1>Admin Quiz Management</h1>
        <nav className={styles.adminNav}>
          {["questions", "courseYears", "courses", "statistics"].map((tab) => (
            <button
              key={tab}
              className={`${styles.navBtn} ${activeTab === tab ? styles.active : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "questions" && "Questions"}
              {tab === "courseYears" && "Course Years"}
              {tab === "courses" && "Courses"}
              {tab === "statistics" && "Statistics"}
            </button>
          ))}
        </nav>
      </header>
      
      {/* Questions Tab */}
      {activeTab === "questions" && (
        <div className={styles.tabContent}>
          {/* Add/Edit Question Form */}
          <div className={styles.formSection}>
            <h3>{editingQuestion ? "Edit Question" : "Add New Question"}</h3>
            <form onSubmit={editingQuestion ? handleUpdateQuestion : handleAddQuestion}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Course Code</label>
                  <input
                    type="text"
                    value={questionForm.course}
                    onChange={(e) => setQuestionForm({ ...questionForm, course: e.target.value.toLowerCase() })}
                    placeholder="e.g., mth101"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Year</label>
                  <input
                    type="text"
                    value={questionForm.year}
                    onChange={(e) => setQuestionForm({ ...questionForm, year: e.target.value })}
                    placeholder="e.g., 2024A"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Topic</label>
                  <input
                    type="text"
                    value={questionForm.topic}
                    onChange={(e) => setQuestionForm({ ...questionForm, topic: e.target.value })}
                    placeholder="e.g., Mathematical Induction"
                    required
                  />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>Question</label>
                <textarea
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                  placeholder="Enter the question..."
                  required
                />
              </div>
              
            {/* Image Upload */}
      <div className={styles.formGroup}>
        <label>Question Image (Optional)</label>
        <div className={styles.imageUploadContainer}>
          {questionForm.imagePreview ? (
            <div className={styles.imagePreviewContainer}>
              <img 
                src={questionForm.imagePreview} 
                alt="Question preview" 
                className={styles.imagePreview}
              />
              <button 
                type="button" 
                className={styles.removeImageBtn}
                onClick={removeImage}
              >
                Remove Image
              </button>
            </div>
          ) : (
            <div className={styles.imageUploadBox}>
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={handleImageUpload}
                className={styles.imageInput}
              />
              <label htmlFor="image-upload" className={styles.imageUploadLabel}>
                <i className="fas fa-cloud-upload-alt"></i>
                <span>Click to upload an image</span>
                <p>Supports: JPG, PNG, GIF (Max 5MB)</p>
              </label>
            </div>
          )}
        </div>
      </div>
              
              {/* Options Section */}
              <div className={styles.optionsSection}>
                <div className={styles.optionsHeader}>
                  <label>Options ({questionForm.options.length}/4)</label>
                  {questionForm.options.length < 4 && (
                    <button 
                      type="button" 
                      className={`${styles.btn} ${styles.btnSmall}`}
                      onClick={addOption}
                    >
                      <i className="fas fa-plus"></i> Add Option
                    </button>
                  )}
                </div>
                
                {questionForm.options.map((option, index) => (
                  <div key={index} className={styles.optionInput}>
                    <input
                      type="radio"
                      name="correctOption"
                      checked={questionForm.correctOption === index + 1}
                      onChange={() => setQuestionForm({ ...questionForm, correctOption: index + 1 })}
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...questionForm.options]
                        newOptions[index] = e.target.value
                        setQuestionForm({ ...questionForm, options: newOptions })
                      }}
                      placeholder={`Option ${index + 1}`}
                      required
                    />
                    {questionForm.options.length > 2 && (
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnDeleteSmall}`}
                        onClick={() => removeOption(index)}
                        title="Remove option"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <div className={styles.formGroup}>
                <label>Explanation</label>
                <textarea
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  placeholder="Explain the correct answer..."
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Tags (comma-separated)</label>
                <input
                  type="text"
                  value={questionForm.tags}
                  onChange={(e) => setQuestionForm({ ...questionForm, tags: e.target.value })}
                  placeholder="e.g., mathematical induction, divisibility"
                />
              </div>
              
              <div className={styles.formActions}>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  {editingQuestion ? "Update Question" : "Add Question"}
                </button>
                {editingQuestion && (
                  <button type="button" onClick={cancelEdit} className={`${styles.btn} ${styles.btnSecondary}`}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
          
          {/* Bulk Import Section */}
          <div className={styles.formSection}>
            <h3>Bulk Import Questions</h3>
            <div className={styles.bulkImportInstructions}>
              <p><strong>Important:</strong> Please ensure your JSON follows these requirements:</p>
              <ul>
                <li>Must be a valid JSON array of question objects</li>
                <li>Each question must have: question, options (array of 2-4), correctOption (1-N), explanation, course, year, topic</li>
                <li>Correct option must be a number between 1 and the number of options</li>
                <li>Tags field is optional and should be an array of strings</li>
                <li>Image field is optional and should be a URL string</li>
              </ul>
              <p><strong>Example:</strong></p>
              <pre className={styles.jsonExample}>
{`[
  {
    "question": "What is 2+2?",
    "options": ["3", "4"],
    "correctOption": 2,
    "explanation": "2+2 equals 4",
    "course": "mth101",
    "year": "2024A",
    "topic": "Basic Arithmetic",
    "tags": ["addition", "basic"]
  }
]`}
              </pre>
            </div>
            
            {/* Progress Indicator */}
            {bulkImportProgress.loading && (
              <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                  <div 
                    className={`${styles.progressFill} ${bulkImportProgress.error ? styles.error : ''}`}
                    style={{ width: `${bulkImportProgress.progress}%` }}
                  ></div>
                </div>
                <div className={styles.progressMessage}>
                  {bulkImportProgress.message}
                </div>
              </div>
            )}
            
            <form onSubmit={handleBulkImport}>
              <div className={styles.formGroup}>
                <label>JSON Data</label>
                <textarea
                  value={bulkImportData}
                  onChange={(e) => setBulkImportData(e.target.value)}
                  placeholder="Paste JSON array of questions here..."
                  rows="10"
                  disabled={bulkImportProgress.loading}
                />
              </div>
              
              <div className={styles.formActions}>
                <button 
                  type="submit" 
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={bulkImportProgress.loading}
                >
                  {bulkImportProgress.loading ? 'Importing...' : 'Import Questions'}
                </button>
                
                <button 
                  type="button" 
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={handleCleanupPending}
                  disabled={cleanupLoading || bulkImportProgress.loading}
                >
                  {cleanupLoading ? 'Cleaning up...' : 'Cleanup Pending Questions'}
                </button>
              </div>
            </form>
            
            <div className={styles.cleanupInfo}>
              <p><strong>All-or-Nothing Import:</strong> This import process ensures that either all questions are successfully imported or none are imported. If any part of the import fails, all questions from that batch are automatically removed.</p>
              <p><strong>Cleanup Pending Questions:</strong> This will remove any questions that were partially imported due to timeouts or errors. Use this if you suspect incomplete imports.</p>
            </div>
          </div>
          
          {/* Search and Filter */}
          <div className={styles.searchSection}>
            <div className={styles.searchRow}>
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button onClick={fetchQuestions} className={`${styles.btn} ${styles.btnPrimary}`}>
                Search
              </button>
            </div>
            <div className={styles.filterRow}>
              <select value={filters.course} onChange={(e) => setFilters({ ...filters, course: e.target.value })}>
                <option value="">All Courses</option>
                {Array.isArray(courses) && courses.map(course => (
                  <option key={course.courseCode} value={course.courseCode}>
                    {course.courseCode.toUpperCase()} - {course.courseName}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Year"
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              />
              <input
                type="text"
                placeholder="Topic"
                value={filters.topic}
                onChange={(e) => setFilters({ ...filters, topic: e.target.value })}
              />
            </div>
          </div>
          
 {/* Questions List */}
      <div className={styles.questionsList}>
        {loading ? (
          <div className={styles.loading}>Loading questions...</div>
        ) : questions.length === 0 ? (
          <div className={styles.noResults}>
            <p>No questions found. Try adjusting your search or filters.</p>
          </div>
        ) : (
          questions.map((question) => (
            <div key={question._id} className={styles.questionCard}>
              <div className={styles.questionHeader}>
                <span className={`${styles.badge} ${styles.courseBadge}`}>{question.course.toUpperCase()}</span>
                <span className={`${styles.badge} ${styles.yearBadge}`}>{question.year}</span>
                <span className={`${styles.badge} ${styles.topicBadge}`}>{question.topic}</span>
              </div>
              
              <div className={styles.questionContent}>
                <p className={styles.questionText}>{question.question}</p>
                
                {(question.cloudinaryUrl || question.image) && (
                  <div className={styles.questionImage}>
                    <img 
                      src={question.cloudinaryUrl || (question.image.startsWith('/uploads') ? question.image : `/uploads${question.image}`)} 
                      alt="Question Image" 
                    />
                  </div>
                )}
                    
                    <div className={styles.options}>
                      {question.options.map((option, index) => (
                        <div key={index} className={`${styles.option} ${index + 1 === question.correctOption ? styles.correct : ""}`}>
                          {index + 1}. {option}
                        </div>
                      ))}
                    </div>
                    
                    <div className={styles.explanation}>
                      <strong>Explanation:</strong> {question.explanation}
                    </div>
                    
                    {question.tags.length > 0 && (
                      <div className={styles.tags}>
                        <strong>Tags:</strong> {question.tags.join(", ")}
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.questionActions}>
                    <button onClick={() => startEditQuestion(question)} className={`${styles.btn} ${styles.btnEdit}`}>
                      Edit
                    </button>
                    <button onClick={() => handleDeleteQuestion(question._id)} className={`${styles.btn} ${styles.btnDelete}`}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Course Years Tab */}
      {activeTab === "courseYears" && (
        <div className={styles.tabContent}>
          <div className={styles.sectionHeader}>
            <h2>Course Years Management</h2>
          </div>
          
          {/* Add Course Year Form */}
          <div className={styles.formSection}>
            <h3>Add New Course Year</h3>
            <form onSubmit={handleAddCourseYear}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Course Code</label>
                  <input
                    type="text"
                    value={courseYearForm.course}
                    onChange={(e) => setCourseYearForm({ ...courseYearForm, course: e.target.value.toLowerCase() })}
                    placeholder="e.g., mth101"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Year</label>
                  <input
                    type="text"
                    value={courseYearForm.year}
                    onChange={(e) => setCourseYearForm({ ...courseYearForm, year: e.target.value })}
                    placeholder="e.g., 2024A"
                    required
                  />
                </div>
              </div>
              
              <div className={styles.formActions}>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  Add Course Year
                </button>
              </div>
            </form>
          </div>
          
          {/* Course Years List */}
          <div className={styles.courseYearsList}>
            {Object.entries(courseYears).length === 0 ? (
              <div className={styles.noResults}>
                <p>No course years found. Add some course years to get started.</p>
              </div>
            ) : (
              Object.entries(courseYears).map(([course, data]) => (
                <div key={course} className={styles.courseGroup}>
                  <h3 className={styles.courseTitle}>{course.toUpperCase()} - {data.courseName}</h3>
                  <div className={styles.yearsGrid}>
                    {data.years.map((yearData) => (
                      <div key={yearData._id} className={styles.yearCard}>
                        <span className={styles.yearText}>{yearData.year}</span>
                        <button 
                          onClick={() => handleDeleteCourseYear(yearData._id)} 
                          className={`${styles.btn} ${styles.btnDeleteSmall}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Courses Tab */}
      {activeTab === "courses" && (
        <div className={styles.tabContent}>
          <div className={styles.sectionHeader}>
            <h2>Course Management</h2>
            <div className={styles.semesterActions}>
              <button 
                onClick={() => handleDeactivateSemester('first')} 
                className={`${styles.btn} ${styles.btnWarning}`}
              >
                Deactivate First Semester
              </button>
              <button 
                onClick={() => handleDeactivateSemester('second')} 
                className={`${styles.btn} ${styles.btnWarning}`}
              >
                Deactivate Second Semester
              </button>
              <button 
                onClick={() => handleDeactivateSemester('both')} 
                className={`${styles.btn} ${styles.btnDanger}`}
              >
                Deactivate Both Semesters
              </button>
            </div>
          </div>
          
          {/* Add/Edit Course Form */}
          <div className={styles.formSection}>
            <h3>{editingCourse ? "Edit Course" : "Add New Course"}</h3>
            <form onSubmit={editingCourse ? handleUpdateCourse : handleAddCourse}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Course Code</label>
                  <input
                    type="text"
                    value={courseForm.courseCode}
                    onChange={(e) => setCourseForm({ ...courseForm, courseCode: e.target.value.toLowerCase() })}
                    placeholder="e.g., chm101"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Course Name</label>
                  <input
                    type="text"
                    value={courseForm.courseName}
                    onChange={(e) => setCourseForm({ ...courseForm, courseName: e.target.value })}
                    placeholder="e.g., General Chemistry"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Semester</label>
                  <select
                    value={courseForm.semester}
                    onChange={(e) => setCourseForm({ ...courseForm, semester: e.target.value })}
                    required
                  >
                    <option value="first">First Semester</option>
                    <option value="second">Second Semester</option>
                  </select>
                </div>
              </div>
              
              <div className={styles.formActions}>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  {editingCourse ? "Update Course" : "Add Course"}
                </button>
                {editingCourse && (
                  <button type="button" onClick={cancelEditCourse} className={`${styles.btn} ${styles.btnSecondary}`}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
          
          {/* Courses List */}
          <div className={styles.coursesList}>
            {Array.isArray(courses) && courses.length === 0 ? (
              <div className={styles.noResults}>
                <p>No courses found. Add some courses to get started.</p>
              </div>
            ) : (
              Array.isArray(courses) && courses.map((course) => (
                <div key={course._id} className={`${styles.courseCard} ${!course.isActive ? styles.inactive : ''}`}>
                  <div className={styles.courseHeader}>
                    <span className={`${styles.badge} ${styles.courseCode}`}>{course.courseCode.toUpperCase()}</span>
                    <span className={styles.courseName}>{course.courseName}</span>
                    <span className={`${styles.badge} ${styles.semesterBadge} ${course.semester}`}>
                      {course.semester === 'first' ? 'First Semester' : 'Second Semester'}
                    </span>
                    <span className={`${styles.badge} ${styles.statusBadge} ${course.isActive ? styles.active : styles.inactive}`}>
                      {course.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className={styles.courseActions}>
                    <button onClick={() => startEditCourse(course)} className={`${styles.btn} ${styles.btnEdit}`}>
                      Edit
                    </button>
                    <button 
                      onClick={() => handleToggleCourseStatus(course._id, course.isActive)} 
                      className={`${styles.btn} ${course.isActive ? styles.btnDeactivate : styles.btnActivate}`}
                    >
                      {course.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Statistics Tab */}
      {activeTab === "statistics" && (
        <div className={styles.tabContent}>
          <div className={styles.sectionHeader}>
            <h2>Quiz Statistics</h2>
            <button 
              onClick={fetchStatistics}
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={loading}
            >
              <i className="fas fa-sync-alt"></i> {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          
          {loading ? (
            <div className={styles.loading}>Loading statistics...</div>
          ) : (
            <div className={styles.statisticsGrid}>
              <div className={styles.statsCard}>
                <h3>Question Statistics</h3>
                <div className={styles.statsGrid}>
                  <div className={styles.statItem}>
                    <div className={styles.statValue}>{statistics.totalQuestions}</div>
                    <div className={styles.statLabel}>Total Questions</div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statValue}>{statistics.courseStats?.length || 0}</div>
                    <div className={styles.statLabel}>Courses</div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statValue}>{statistics.yearStats?.length || 0}</div>
                    <div className={styles.statLabel}>Years</div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statValue}>{statistics.topicStats?.length || 0}</div>
                    <div className={styles.statLabel}>Topics</div>
                  </div>
                </div>
              </div>
              
              <div className={styles.statsCard}>
                <h3>Questions by Course</h3>
                <div className={styles.statsList}>
                  {statistics.courseStats?.map((stat) => (
                    <div key={stat._id} className={styles.statsListItem}>
                      <span className={styles.statsName}>{stat._id.toUpperCase()}</span>
                      <span className={styles.statsValue}>{stat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className={styles.statsCard}>
                <h3>Questions by Year</h3>
                <div className={styles.statsList}>
                  {statistics.yearStats?.map((stat) => (
                    <div key={stat._id} className={styles.statsListItem}>
                      <span className={styles.statsName}>{stat._id}</span>
                      <span className={styles.statsValue}>{stat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className={styles.statsCard}>
                <h3>Questions by Topic</h3>
                <div className={styles.statsList}>
                  {statistics.topicStats?.map((stat) => (
                    <div key={stat._id} className={styles.statsListItem}>
                      <span className={styles.statsName}>{stat._id}</span>
                      <span className={styles.statsValue}>{stat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className={styles.statsCard}>
                <h3>System Information</h3>
                <div className={styles.statsList}>
                  <div className={styles.statsListItem}>
                    <span className={styles.statsName}>Total Courses</span>
                    <span className={styles.statsValue}>{courses.length}</span>
                  </div>
                  <div className={styles.statsListItem}>
                    <span className={styles.statsName}>Active Courses</span>
                    <span className={styles.statsValue}>
                      {courses.filter(course => course.isActive).length}
                    </span>
                  </div>
                  <div className={styles.statsListItem}>
                    <span className={styles.statsName}>Inactive Courses</span>
                    <span className={styles.statsValue}>
                      {courses.filter(course => !course.isActive).length}
                    </span>
                  </div>
                  <div className={styles.statsListItem}>
                    <span className={styles.statsName}>Total Course Years</span>
                    <span className={styles.statsValue}>
                      {Object.values(courseYears).reduce((acc, course) => acc + course.years.length, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminQuizManagement