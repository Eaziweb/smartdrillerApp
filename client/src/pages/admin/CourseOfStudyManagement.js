"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import styles from "../../styles/AdminDashboard.module.css"

const CourseOfStudyManagement = () => {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [categories, setCategories] = useState([])
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  useEffect(() => {
    loadCourses()
    loadCategories()
  }, [])

  const loadCourses = async () => {
    try {
      const response = await axios.get("/api/courseofstudy")
      setCourses(response.data.courses)
    } catch (error) {
      console.error("Failed to load courses:", error)
    }
    setLoading(false)
  }

  const loadCategories = async () => {
    try {
      const response = await axios.get("/api/courseofstudy/categories/list")
      setCategories(response.data.categories)
    } catch (error) {
      console.error("Failed to load categories:", error)
    }
  }

  const handleSaveCourse = async (courseData) => {
    try {
      if (editingCourse) {
        await axios.put(`/api/courseofstudy/${editingCourse._id}`, courseData)
        showMessage("Course updated successfully!", "success")
      } else {
        await axios.post("/api/courseofstudy", courseData)
        showMessage("Course added successfully!", "success")
      }
      loadCourses()
      setShowCourseForm(false)
      setEditingCourse(null)
    } catch (error) {
      showMessage("Failed to save course", "error")
    }
  }

  const handleDeleteCourse = async (courseId) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      try {
        await axios.delete(`/api/courseofstudy/${courseId}`)
        showMessage("Course deleted successfully!", "success")
        loadCourses()
      } catch (error) {
        showMessage("Failed to delete course", "error")
      }
    }
  }



  const showMessage = (message, type = "info") => {
    const messageEl = document.createElement("div")
    messageEl.className = `${styles.messageToast} ${styles[type]}`
    messageEl.innerHTML = `
      <i class="fas ${type === "success" ? "fa-check-circle" : type === "error" ? "fa-exclamation-triangle" : "fa-info-circle"}"></i>
      <span>${message}</span>
    `
    document.body.appendChild(messageEl)
    setTimeout(() => {
      messageEl.style.animation = "slideOutRight 0.3s ease forwards"
      setTimeout(() => messageEl.remove(), 300)
    }, 3000)
  }

  // Filter courses based on search term and selected category
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          course.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || course.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className={styles.loading}>
        <i className="fas fa-spinner fa-spin"></i>
        Loading courses...
      </div>
    )
  }

  return (
    <div className={styles.adminPage}>
      <div className={styles.adminContainer}>
        <div className={styles.adminHeader}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <div>
              <h1>Course of Study Management</h1>
              <p>Manage all available courses of study</p>
            </div>
            <Link to="/admin/dashboard" className={styles.backBtn}>
              <i className="fas fa-arrow-left"></i> Back to Dashboard
            </Link>
          </div>
        </div>
        
        {/* Admin Section */}
        <div className={styles.adminSection}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2>Course Management</h2>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button 
                className={styles.submitBtn}
                onClick={() => {
                  setEditingCourse(null)
                  setShowCourseForm(true)
                }}
              >
                <i className="fas fa-plus"></i>
                <span>Add Course</span>
              </button>
            </div>
          </div>
          
          {/* Search and Filter */}
          <div className={styles.inputRow} style={{ marginBottom: "1.5rem" }}>
            <div className={styles.inputGroup}>
              <label htmlFor="search">Search Courses</label>
              <input
                type="text"
                id="search"
                placeholder="Search by name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="category">Filter by Category</label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Courses Table */}
          <div className={styles.universityTable}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>Course Name</th>
                  <th>Category</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((course) => (
                  <tr key={course._id}>
                    <td>{course.name}</td>
                    <td>{course.category}</td>
                    <td>
                      <button 
                        className={styles.editBtn}
                        onClick={() => {
                          setEditingCourse(course)
                          setShowCourseForm(true)
                        }}
                        style={{ marginRight: "0.5rem" }}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteCourse(course._id)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredCourses.length === 0 && (
            <div className={styles.emptyState}>
              <i className="fas fa-book"></i>
              <p>No courses found. Click "Populate Default Courses" to get started.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Course Form Modal */}
      {showCourseForm && (
        <CourseFormModal
          course={editingCourse}
          categories={categories}
          onSave={handleSaveCourse}
          onClose={() => {
            setShowCourseForm(false)
            setEditingCourse(null)
          }}
        />
      )}
    </div>
  )
}

// Course Form Modal Component
const CourseFormModal = ({ course, categories, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: course?.name || "",
    category: course?.category || (categories.length > 0 ? categories[0] : ""),
  })
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }
  
  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
        
        <div className={styles.modalHeader}>
          <h2>{course ? "Edit Course" : "Add Course"}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.adminForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="name">Course Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <button type="submit" className={styles.submitBtn}>
            <span>{course ? "Update Course" : "Add Course"}</span>
            <i className="fas fa-save"></i>
          </button>
        </form>
      </div>
    </div>
  )
}

export default CourseOfStudyManagement