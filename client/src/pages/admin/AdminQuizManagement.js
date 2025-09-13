// components/AdminQuizManagement.js
"use client"
import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/AdminQuizManagement.module.css"

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
  
  // Question form state
  const [questionForm, setQuestionForm] = useState({
    question: "",
    options: ["", "", "", ""],
    correctOption: 1, // Default to option 1
    explanation: "",
    tags: "",
    course: "",
    year: "",
    topic: "",
    image: null,
    imagePreview: null,
  })
  
  // Course year form state
  const [courseYearForm, setCourseYearForm] = useState({
    course: "",
    year: "",
  })
  
  // Course form state
  const [courseForm, setCourseForm] = useState({
    courseCode: "",
    courseName: "",
    semester: "first",
  })
  
  // Bulk import state
  const [bulkImportData, setBulkImportData] = useState("")
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [editingCourse, setEditingCourse] = useState(null)
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: "",
    onConfirm: null,
  })
  
  // Toast notification state
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  })
  
  useEffect(() => {
    fetchQuestions()
    fetchCourseYears()
    fetchCourses()
  }, [])
  
  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses/admin", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      const data = await response.json()
      setCourses(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching courses:", error)
      setCourses([])
    }
  }
  
  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        q: searchTerm,
        ...filters,
      }).toString()
      const response = await fetch(`/api/questions/admin/search?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      const data = await response.json()
      setQuestions(data.questions || [])
    } catch (error) {
      console.error("Error fetching questions:", error)
      showToast("Failed to fetch questions", "error")
    }
    setLoading(false)
  }
  
  const fetchCourseYears = async () => {
    try {
      const response = await fetch("/api/courseYears/admin", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      const data = await response.json()
      setCourseYears(data.courseYears || {})
    } catch (error) {
      console.error("Error fetching course years:", error)
    }
  }
  
  const showToast = (message, type = "success") => {
    setToast({
      show: true,
      message,
      type,
    })
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000)
  }
  
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Check if file is an image
      if (!file.type.match('image.*')) {
        showToast("Please select an image file", "error")
        return
      }
      
      // Check file size (limit to 5MB)
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
  
  const handleAddQuestion = async (e) => {
    e.preventDefault()
    
    // Validate correct option is between 1-4
    if (questionForm.correctOption < 1 || questionForm.correctOption > 4) {
      showToast("Correct option must be between 1 and 4", "error")
      return
    }
    
    const formData = new FormData()
    
    // Append all form fields
    formData.append("question", questionForm.question)
    questionForm.options.forEach((option, index) => {
      formData.append(`options[${index}]`, option)
    })
    formData.append("correctOption", questionForm.correctOption)
    formData.append("explanation", questionForm.explanation)
    formData.append("course", questionForm.course)
    formData.append("year", questionForm.year)
    formData.append("topic", questionForm.topic)
    
    // Append tags
    const tags = questionForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
    tags.forEach((tag, index) => {
      formData.append(`tags[${index}]`, tag)
    })
    
    // Append image if exists
    if (questionForm.image) {
      formData.append("image", questionForm.image)
    }
    
    try {
      const response = await fetch("/api/questions/admin/add", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      })
      const data = await response.json()
      if (response.ok) {
        showToast(data.message || "Question added successfully")
        setQuestionForm({
          question: "",
          options: ["", "", "", ""],
          correctOption: 1,
          explanation: "",
          tags: "",
          course: "",
          year: "",
          topic: "",
          image: null,
          imagePreview: null,
        })
        fetchQuestions()
        fetchCourseYears()
      } else {
        showToast(data.message || "Failed to add question", "error")
      }
    } catch (error) {
      console.error("Error adding question:", error)
      showToast("Failed to add question", "error")
    }
  }
  
  const handleUpdateQuestion = async (e) => {
    e.preventDefault()
    
    // Validate correct option is between 1-4
    if (questionForm.correctOption < 1 || questionForm.correctOption > 4) {
      showToast("Correct option must be between 1 and 4", "error")
      return
    }
    
    const formData = new FormData()
    
    // Append all form fields
    formData.append("question", questionForm.question)
    questionForm.options.forEach((option, index) => {
      formData.append(`options[${index}]`, option)
    })
    formData.append("correctOption", questionForm.correctOption)
    formData.append("explanation", questionForm.explanation)
    formData.append("course", questionForm.course)
    formData.append("year", questionForm.year)
    formData.append("topic", questionForm.topic)
    
    // Append tags
    const tags = questionForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
    tags.forEach((tag, index) => {
      formData.append(`tags[${index}]`, tag)
    })
    
    // Append image if exists
    if (questionForm.image) {
      formData.append("image", questionForm.image)
    }
    
    try {
      const response = await fetch(`/api/questions/admin/${editingQuestion._id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      })
      const data = await response.json()
      if (response.ok) {
        showToast("Question updated successfully")
        setEditingQuestion(null)
        setQuestionForm({
          question: "",
          options: ["", "", "", ""],
          correctOption: 1,
          explanation: "",
          tags: "",
          course: "",
          year: "",
          topic: "",
          image: null,
          imagePreview: null,
        })
        fetchQuestions()
      } else {
        showToast(data.message || "Failed to update question", "error")
      }
    } catch (error) {
      console.error("Error updating question:", error)
      showToast("Failed to update question", "error")
    }
  }
  
  const deleteQuestion = async (questionId) => {
    try {
      const response = await fetch(`/api/questions/admin/${questionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      if (response.ok) {
        showToast("Question deleted successfully")
        fetchQuestions()
      } else {
        showToast("Failed to delete question", "error")
      }
    } catch (error) {
      console.error("Error deleting question:", error)
      showToast("Failed to delete question", "error")
    }
  }
  
  const handleDeleteQuestion = (questionId) => {
    setConfirmDialog({
      isOpen: true,
      message: "Are you sure you want to delete this question?",
      onConfirm: () => deleteQuestion(questionId),
    })
  }
  
  const handleBulkImport = async (e) => {
    e.preventDefault();
    try {
      // Function to try parsing JSON after escaping backslashes
      const tryParse = (data) => {
        try {
          // Escape all single backslashes → double backslashes
          const escaped = data.replace(/\\/g, '\\\\');
          return JSON.parse(escaped);
        } catch (err) {
          return null;
        }
      };
      
      // First attempt: parse with backslash escaping
      let parsedQuestions = tryParse(bulkImportData);
      
      // Validate that we have an array
      if (!parsedQuestions || !Array.isArray(parsedQuestions)) {
        showToast("Invalid JSON format. Must be an array of questions.", "error");
        return;
      }
      
      // Validate each question
      const validatedQuestions = parsedQuestions.map((q, index) => {
        if (!q.question || !q.options || q.correctOption === undefined || 
            !q.explanation || !q.course || !q.year || !q.topic) {
          throw new Error(`Question ${index + 1}: Missing required fields`);
        }
        
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          throw new Error(`Question ${index + 1}: Must have exactly 4 options`);
        }
        
        const correctOption = Number(q.correctOption);
        if (isNaN(correctOption) || correctOption < 1 || correctOption > 4) {
          throw new Error(`Question ${index + 1}: Correct option must be between 1 and 4`);
        }
        
        return {
          ...q,
          correctOption: correctOption
        };
      });
      
      // Send to server
      const response = await fetch("/api/questions/admin/bulk-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ questions: validatedQuestions }),
      });
      
      const data = await response.json();
      if (response.ok) {
        showToast(data.message);
        setBulkImportData("");
        fetchQuestions();
        fetchCourseYears();
      } else {
        showToast(data.message || "Failed to import questions", "error");
      }
    } catch (error) {
      console.error("Error importing questions:", error);
      showToast(`Import failed: ${error.message}`, "error");
    }
  };

  const handleAddCourseYear = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch("/api/courseYears/admin/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(courseYearForm),
      })
      const data = await response.json()
      if (response.ok) {
        showToast("Course year added successfully")
        setCourseYearForm({ course: "", year: "" })
        fetchCourseYears()
      } else {
        showToast(data.message || "Failed to add course year", "error")
      }
    } catch (error) {
      console.error("Error adding course year:", error)
      showToast("Failed to add course year", "error")
    }
  }
  
  const deleteCourseYear = async (courseYearId) => {
    try {
      const response = await fetch(`/api/courseYears/admin/${courseYearId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      if (response.ok) {
        showToast("Course year deleted successfully")
        fetchCourseYears()
      } else {
        showToast("Failed to delete course year", "error")
      }
    } catch (error) {
      console.error("Error deleting course year:", error)
      showToast("Failed to delete course year", "error")
    }
  }
  
  const handleDeleteCourseYear = (courseYearId) => {
    setConfirmDialog({
      isOpen: true,
      message: "Are you sure you want to delete this course year?",
      onConfirm: () => deleteCourseYear(courseYearId),
    })
  }
  
  // Course management functions
  const handleAddCourse = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch("/api/courses/admin/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(courseForm),
      })
      const data = await response.json()
      if (response.ok) {
        showToast(data.message)
        setCourseForm({
          courseCode: "",
          courseName: "",
          semester: "first",
        })
        fetchCourses()
      } else {
        showToast(data.message || "Failed to add course", "error")
      }
    } catch (error) {
      console.error("Error adding course:", error)
      showToast("Failed to add course", "error")
    }
  }
  
  const handleUpdateCourse = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch(`/api/courses/admin/${editingCourse._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(courseForm),
      })
      const data = await response.json()
      if (response.ok) {
        showToast("Course updated successfully")
        setEditingCourse(null)
        setCourseForm({
          courseCode: "",
          courseName: "",
          semester: "first",
        })
        fetchCourses()
      } else {
        showToast(data.message || "Failed to update course", "error")
      }
    } catch (error) {
      console.error("Error updating course:", error)
      showToast("Failed to update course", "error")
    }
  }
  
  const toggleCourseStatus = async (courseId, currentStatus) => {
    try {
      const response = await fetch(`/api/courses/admin/${courseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      const data = await response.json()
      if (response.ok) {
        showToast(`Course ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
        fetchCourses()
      } else {
        showToast(data.message || `Failed to ${!currentStatus ? 'activate' : 'deactivate'} course`, "error")
      }
    } catch (error) {
      console.error(`Error ${!currentStatus ? 'activating' : 'deactivating'} course:`, error)
      showToast(`Failed to ${!currentStatus ? 'activate' : 'deactivate'} course`, "error")
    }
  }
  
  const handleToggleCourseStatus = (courseId, currentStatus) => {
    setConfirmDialog({
      isOpen: true,
      message: `Are you sure you want to ${!currentStatus ? 'activate' : 'deactivate'} this course?`,
      onConfirm: () => toggleCourseStatus(courseId, currentStatus),
    })
  }
  
  const handleDeactivateSemester = async (semester) => {
    try {
      const response = await fetch("/api/courses/admin/deactivate-semester", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ semester }),
      })
      const data = await response.json()
      if (response.ok) {
        showToast(data.message)
        fetchCourses()
      } else {
        showToast(data.message || "Failed to deactivate semester", "error")
      }
    } catch (error) {
      console.error("Error deactivating semester:", error)
      showToast("Failed to deactivate semester", "error")
    }
  }
  
  const startEditQuestion = (question) => {
    setEditingQuestion(question)
    setQuestionForm({
      question: question.question,
      options: [...question.options],
      correctOption: question.correctOption, // FIXED: Use as-is (1-4)
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
  
  const cancelEdit = () => {
    setEditingQuestion(null)
    setQuestionForm({
      question: "",
      options: ["", "", "", ""],
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
  
  const cancelEditCourse = () => {
    setEditingCourse(null)
    setCourseForm({
      courseCode: "",
      courseName: "",
      semester: "first",
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
          <button 
            className={`${styles.navBtn} ${activeTab === "questions" ? styles.active : ""}`} 
            onClick={() => setActiveTab("questions")}
          >
            Questions
          </button>
          <button 
            className={`${styles.navBtn} ${activeTab === "courseYears" ? styles.active : ""}`} 
            onClick={() => setActiveTab("courseYears")}
          >
            Course Years
          </button>
          <button 
            className={`${styles.navBtn} ${activeTab === "courses" ? styles.active : ""}`} 
            onClick={() => setActiveTab("courses")}
          >
            Courses
          </button>
        </nav>
      </header>
      
      {/* Questions Tab */}
      {activeTab === "questions" && (
        <div className={styles.questionsSection}>
          <div className={styles.sectionHeader}>
            <h2>Question Management</h2>
          </div>
          
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
              
              {/* Image Upload Section */}
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
              
              <div className={styles.optionsSection}>
                <label>Options</label>
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
                <li>Each question must have: question, options (array of 4), correctOption (1-4), explanation, course, year, topic</li>
                <li>Correct option must be a number between 1 and 4 (1 = first option, 2 = second option, etc.)</li>
                <li>Tags field is optional and should be an array of strings</li>
                <li>Image field is optional and should be a URL string</li>
              </ul>
              <p><strong>Example:</strong></p>
              <pre className={styles.jsonExample}>
{`[
  {
    "question": "What is 2+2?",
    "options": ["3", "4", "5", "6"],
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
            <form onSubmit={handleBulkImport}>
              <div className={styles.formGroup}>
                <label>JSON Data</label>
                <textarea
                  value={bulkImportData}
                  onChange={(e) => setBulkImportData(e.target.value)}
                  placeholder="Paste JSON array of questions here..."
                  rows="10"
                />
              </div>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                Import Questions
              </button>
            </form>
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
                    {question.image && (
                      <div className={styles.questionImage}>
                        <img src={question.image} alt="Question Image" />
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
        <div className={styles.courseYearsSection}>
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
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                Add Course Year
              </button>
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
                        <button onClick={() => handleDeleteCourseYear(yearData._id)} className={`${styles.btn} ${styles.btnDeleteSmall}`}>
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
        <div className={styles.coursesSection}>
          <div className={styles.sectionHeader}>
            <h2>Course Management</h2>
            <div className={styles.semesterActions}>
              <button onClick={() => handleDeactivateSemester('first')} className={`${styles.btn} ${styles.btnWarning}`}>
                Deactivate First Semester
              </button>
              <button onClick={() => handleDeactivateSemester('second')} className={`${styles.btn} ${styles.btnWarning}`}>
                Deactivate Second Semester
              </button>
              <button onClick={() => handleDeactivateSemester('both')} className={`${styles.btn} ${styles.btnDanger}`}>
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
    </div>
  )
}

export default AdminQuizManagement