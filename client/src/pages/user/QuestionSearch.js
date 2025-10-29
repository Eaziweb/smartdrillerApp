"use client"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/QuestionSearch.module.css"
import api from "../../utils/api";

// Import KaTeX CSS
import 'katex/dist/katex.min.css'

const QuestionSearch = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [courses, setCourses] = useState([]) // Changed to array of objects
  const [selectedCourse, setSelectedCourse] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchType, setSearchType] = useState("question")
  const [questions, setQuestions] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState("")
  const [katexLoaded, setKatexLoaded] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    fetchCourses()
    
    // Load KaTeX dynamically
    const loadKaTeX = async () => {
      try {
        // Import KaTeX components
        const katexModule = await import('katex')
        const { render, renderToString } = katexModule
        
        // Store KaTeX functions globally for easy access
        window.katex = {
          render,
          renderToString
        }
        
        setKatexLoaded(true)
      } catch (error) {
        console.error("Error loading KaTeX:", error)
      }
    }
    
    loadKaTeX()
  }, [])

  // Process content with KaTeX when it changes
  useEffect(() => {
    if (katexLoaded && questions.length > 0 && contentRef.current) {
      processMathContent()
    }
  }, [katexLoaded, questions, currentPage])

  const processMathContent = () => {
    if (!window.katex) return
    
    // Find all elements with math content
    const mathElements = contentRef.current.querySelectorAll('.math-content')
    
    mathElements.forEach(element => {
      const content = element.getAttribute('data-math')
      if (content) {
        try {
          // Render the math content
          const renderedMath = window.katex.renderToString(content, {
            throwOnError: false,
            displayMode: element.classList.contains('display-math')
          })
          element.innerHTML = renderedMath
        } catch (e) {
          console.error("KaTeX rendering error:", e)
          element.innerHTML = content // Fallback to raw content
        }
      }
    })
  }

  // Helper function to render content with math
  const renderContentWithMath = (content, isDisplayMode = false) => {
    if (!content) return null
    
    // Simple regex to find LaTeX patterns
    const latexPattern = /(\\\(.*?\\\)|\\\[.*?\\\]|\$\$.*?\$\$|\$.*?\$)/g
    
    // Split content by LaTeX patterns
    const parts = content.split(latexPattern)
    
    return parts.map((part, index) => {
      if (index % 2 === 1) { // This is a LaTeX expression
        // Determine if it's display mode
        const isDisplay = part.startsWith('\\[') || part.startsWith('$$')
        
        // Extract the actual LaTeX content
        let latexContent = part
        if (part.startsWith('\\(')) latexContent = part.slice(2, -2)
        if (part.startsWith('\\[')) latexContent = part.slice(2, -2)
        if (part.startsWith('$') && !part.startsWith('$$')) latexContent = part.slice(1, -1)
        if (part.startsWith('$$')) latexContent = part.slice(2, -2)
        
        return (
          <span 
            key={index} 
            className={`math-content ${isDisplay ? 'display-math' : 'inline-math'}`}
            data-math={latexContent}
          />
        )
      } else {
        // Regular HTML content
        return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />
      }
    })
  }

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await api.get("/api/questions/course-years", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      const data = response.data
      
      // Transform the data to include course names
      const coursesWithNames = await Promise.all(
        Object.keys(data).map(async (courseCode) => {
          try {
            const courseResponse = await api.get(`/api/courses/${courseCode}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })
            const courseData = courseResponse.data
            return {
              code: courseCode,
              name: courseData.courseName || courseCode.toUpperCase(),
              years: data[courseCode]
            }
          } catch (error) {
            console.error(`Error fetching course name for ${courseCode}:`, error)
            return {
              code: courseCode,
              name: courseCode.toUpperCase(),
              years: data[courseCode]
            }
          }
        })
      )
      
      setCourses(coursesWithNames)
      // Set first course as default
      if (coursesWithNames.length > 0) {
        setSelectedCourse(coursesWithNames[0].code)
      }
    } catch (error) {
      console.error("Error fetching courses:", error)
      setError("Failed to load courses")
    }
  }

  const handleSearch = async (page = 1) => {
    if (!searchQuery.trim() || !selectedCourse) {
      setError("Please enter a search query and select a course")
      return
    }
    setLoading(true)
    setError("")
    try {
      const token = localStorage.getItem("token")
      const response = await api.get(
        `/api/questions/search?q=${encodeURIComponent(searchQuery)}&course=${selectedCourse}&searchType=${searchType}&page=${page}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      
      const data = response.data
      if (data.success) {
        setQuestions(data.questions)
        setPagination(data.pagination)
        setCurrentPage(page)
        setHasSearched(true)
      } else {
        setError(data.message || "Search failed")
      }
    } catch (error) {
      console.error("Error searching questions:", error)
      setError(error.response?.data?.message || "Failed to search questions")
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page) => {
    handleSearch(page)
  }

  const renderPagination = () => {
    if (!pagination.pages || pagination.pages <= 1) return null
    const pages = []
    const maxVisible = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    const endPage = Math.min(pagination.pages, startPage + maxVisible - 1)
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1)
    }
    
    // Previous button
    if (pagination.hasPrev) {
      pages.push(
        <button
          key="prev"
          onClick={() => handlePageChange(currentPage - 1)}
          className={styles.paginationBtn}
          disabled={loading}
        >
          <i className="fas fa-chevron-left"></i> Previous
        </button>,
      )
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`${styles.paginationBtn} ${i === currentPage ? styles.active : ""}`}
          disabled={loading}
        >
          {i}
        </button>,
      )
    }
    
    // Next button
    if (pagination.hasNext) {
      pages.push(
        <button
          key="next"
          onClick={() => handlePageChange(currentPage + 1)}
          className={styles.paginationBtn}
          disabled={loading}
        >
          Next <i className="fas fa-chevron-right"></i>
        </button>,
      )
    }
    
    return <div className={styles.pagination}>{pages}</div>
  }

  // Get image URL with proper fallback for Cloudinary and local images
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    
    // If it's a full URL (Cloudinary), return as is
    if (imagePath.startsWith('http')) {
      return imagePath
    }
    
    // If it's a local path starting with /uploads, return as is
    if (imagePath.startsWith('/uploads')) {
      return imagePath
    }
    
    // Otherwise, prepend /uploads
    return `/uploads${imagePath}`
  }
  
  // Handle image error with better fallback
  const handleImageError = (e) => {
    // Prevent infinite loop by removing the error handler
    e.target.onerror = null
    
    // Hide the broken image
    e.target.style.display = 'none'
    
    // If there's a container, show a placeholder
    const container = e.target.parentElement
    if (container && container.classList.contains(styles.questionImage)) {
      // Create a fallback element if it doesn't exist
      if (!container.querySelector('.image-fallback')) {
        const fallback = document.createElement('div')
        fallback.className = 'image-fallback'
        fallback.innerHTML = '<i class="fas fa-image"></i><span>Image not available</span>'
        fallback.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #666;'
        container.appendChild(fallback)
      }
    }
  }

  return (
    <div className={styles.questionSearch} ref={contentRef}>
<div className={styles.searchHeader}>
  <div className={styles.headerContent}>
    <button onClick={() => navigate("/home")} className={styles.backBtn}>
      <i className="fas fa-arrow-left"></i>
    </button>
    <div className={styles.titleSection}>
      <h1>Question Search</h1>
      <p>Search through questions by course and topic</p>
    </div>
    <div className={styles.searchStats}>
      <div className={styles.statsIcon}>
        <i className="fas fa-search"></i>
      </div>
      <div className={styles.statsText}>
        <span className={styles.statsNumber}>{pagination.total || 0}</span>
        <span className={styles.statsLabel}>Results</span>
      </div>
    </div>
  </div>
</div>
      <div className={styles.searchForm}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Course</label>
            <select 
              value={selectedCourse} 
              onChange={(e) => setSelectedCourse(e.target.value)} 
              className={styles.formSelect}
            >
              <option value="">Select Course</option>
              {courses.map((course) => (
                <option key={course.code} value={course.code}>
                  {course.name} ({course.code.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Search In</label>
            <select 
              value={searchType} 
              onChange={(e) => setSearchType(e.target.value)} 
              className={styles.formSelect}
            >
              <option value="question">Question Text Only</option>
              <option value="everything">Everything (Question, Explanation, Tags, Topic)</option>
            </select>
          </div>
        </div>
        
        <div className={styles.searchInputGroup}>
          <input
            type="text"
            placeholder="Enter your search query..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading || !searchQuery.trim() || !selectedCourse}
            className={styles.searchBtn}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Searching...
              </>
            ) : (
              <>
                <i className="fas fa-search"></i> Search
              </>
            )}
          </button>
        </div>
      </div>
      
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      {hasSearched && (
        <div className={styles.searchResults}>
          <div className={styles.resultsHeader}>
            <h2>Search Results</h2>
            {pagination.total > 0 && (
              <p className={styles.resultsCount}>
                Found {pagination.total} question{pagination.total !== 1 ? "s" : ""}
                {pagination.pages > 1 && ` (Page ${currentPage} of ${pagination.pages})`}
              </p>
            )}
          </div>
          
          {questions.length === 0 ? (
            <div className={styles.noResults}>
              <i className="fas fa-search"></i>
              <h3>No questions found</h3>
              <p>No questions match your search criteria. Try different keywords or select another course.</p>
            </div>
          ) : (
            <>
              <div className={styles.questionsList}>
                {questions.map((question, index) => (
                  <div key={question._id} className={styles.questionCard}>
                    <div className={styles.questionHeader}>
                      <span className={styles.questionNumber}>
                        Question {(currentPage - 1) * 10 + index + 1}
                      </span>
                      <div className={styles.questionMeta}>
                        <span className={styles.courseBadge}>{question.course.toUpperCase()}</span>
                        <span className={styles.yearBadge}>{question.year}</span>
                        <span className={styles.topicBadge}>{question.topic}</span>
                      </div>
                    </div>
                    
                    <div className={styles.questionContent}>
                      <h3 className={styles.questionText}>
                        {renderContentWithMath(question.question)}
                      </h3>
                      
                      {/* Display image if available */}
                      {(question.cloudinaryUrl || question.image) && (
                        <div className={styles.questionImage}>
                          <img 
                            src={getImageUrl(question.cloudinaryUrl || question.image)} 
                            alt="Question" 
                            onError={handleImageError}
                          />
                        </div>
                      )}
                      
                      <div className={styles.optionsList}>
                        {question.options.map((option, optIndex) => {
                          const optionNumber = optIndex + 1; // Convert to 1-4
                          const isCorrect = question.correctOption === optionNumber; // Both are 1-4
                          return (
                            <div
                              key={optIndex}
                              className={`${styles.option} ${isCorrect ? styles.correct : ""}`}
                            >
                              <span className={styles.optionLabel}>{String.fromCharCode(65 + optIndex)}.</span>
                              <span className={styles.optionText}>
                                {renderContentWithMath(option)}
                              </span>
                              {isCorrect && <span className={styles.correctIndicator}>✓</span>}
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className={styles.explanation}>
                        <h4>Explanation:</h4>
                        <p>{renderContentWithMath(question.explanation)}</p>
                      </div>
                      
                      {question.tags && question.tags.length > 0 && (
                        <div className={styles.tags}>
                          <strong>Tags:</strong>
                          {question.tags.map((tag, tagIndex) => (
                            <span key={tagIndex} className={styles.tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {renderPagination()}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default QuestionSearch