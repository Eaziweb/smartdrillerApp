"use client"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import styles from "../../styles/bookmarks.module.css"

// Import KaTeX CSS
import 'katex/dist/katex.min.css'

const Bookmarks = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [bookmarks, setBookmarks] = useState({})
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [courseQuestions, setCourseQuestions] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalBookmarks, setTotalBookmarks] = useState(0)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [katexLoaded, setKatexLoaded] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    // Check subscription
    if (!user?.isSubscribed) {
      navigate("/home")
      return
    }
    
    loadBookmarks()
    
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
        console.error("Failed to load KaTeX:", error)
      }
    }
    
    loadKaTeX()
  }, [user, navigate])

  // Process content with KaTeX when it changes
  useEffect(() => {
    if (katexLoaded && courseQuestions.length > 0 && contentRef.current) {
      processMathContent()
    }
  }, [katexLoaded, courseQuestions, currentPage])

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

  const loadBookmarks = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/api/bookmarks")
      // Group bookmarks by course and count them
      const groupedBookmarks = response.data.bookmarks
      let total = 0
      Object.values(groupedBookmarks).forEach((courseBookmarks) => {
        total += courseBookmarks.length
      })
      setBookmarks(groupedBookmarks)
      setTotalBookmarks(total)
      setLoading(false)
    } catch (error) {
      console.error("Failed to load bookmarks:", error)
      showMessage("Failed to load bookmarks", "error")
      setLoading(false)
    }
  }

  const loadCourseQuestions = async (courseCode, page = 1) => {
    try {
      setLoadingQuestions(true)
      const response = await axios.get(`/api/bookmarks?course=${courseCode}&page=${page}&limit=10`)
      setCourseQuestions(response.data.bookmarks)
      setTotalPages(response.data.pagination.pages)
      setCurrentPage(page)
      setLoadingQuestions(false)
    } catch (error) {
      console.error("Failed to load course questions:", error)
      showMessage("Failed to load questions", "error")
      setLoadingQuestions(false)
    }
  }

  const handleCourseSelect = (courseCode) => {
    setSelectedCourse(courseCode)
    setCurrentPage(1)
    loadCourseQuestions(courseCode, 1)
  }

  const handlePageChange = (page) => {
    if (selectedCourse) {
      loadCourseQuestions(selectedCourse, page)
    }
  }

  const handleRemoveBookmark = async (questionId) => {
    try {
      await axios.delete(`/api/bookmarks/${questionId}`)
      // Refresh the current view
      if (selectedCourse) {
        loadCourseQuestions(selectedCourse, currentPage)
      }
      // Refresh the course list
      loadBookmarks()
      showMessage("Bookmark removed", "success")
    } catch (error) {
      console.error("Failed to remove bookmark:", error)
      showMessage("Failed to remove bookmark", "error")
    }
  }

  const handleBackToCourses = () => {
    setSelectedCourse(null)
    setCourseQuestions([])
    setCurrentPage(1)
    setTotalPages(1)
  }

  const showMessage = (message, type = "info") => {
    const messageEl = document.createElement("div")
    messageEl.className = `${styles.messageToast} ${type}`
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

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading bookmarks...</p>
      </div>
    )
  }

  return (
    <div className={styles.bookmarksPage} ref={contentRef}>
      {/* Header */}
      <div className={styles.bookmarksHeader}>
        <button className={styles.backBtn} onClick={() => navigate("/home")}>
          <i className="fa fa-arrow-left"></i>
        </button>
        <h1>My Bookmarks</h1>
        <div className={styles.bookmarkStats}>
          <span>{totalBookmarks} Questions</span>
        </div>
      </div>
      
      <div className={styles.bookmarksContainer}>
        {!selectedCourse ? (
          // Course Selection View
          <div className={styles.coursesView}>
            {Object.keys(bookmarks).length === 0 ? (
              <div className={styles.noBookmarks}>
                <i className="fas fa-bookmark"></i>
                <h3>No Bookmarks Yet</h3>
                <p>Start studying and bookmark questions to see them here.</p>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => navigate("/course-selection?type=study")}>
                  Start Studying
                </button>
              </div>
            ) : (
              <>
                <div className={styles.coursesGrid}>
                  {Object.entries(bookmarks).map(([courseCode, courseBookmarks]) => (
                    <div key={courseCode} className={styles.courseCard} onClick={() => handleCourseSelect(courseCode)}>
                      <div className={styles.courseHeader}>
                        <div className={styles.courseIcon}>
                          <i className="fas fa-book"></i>
                        </div>
                        <div className={styles.courseInfo}>
                          <h3>{courseCode.toUpperCase()}</h3>
                          <span className={styles.questionCount}>
                            {courseBookmarks.length} question{courseBookmarks.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <div className={styles.courseArrow}>
                        <i className="fas fa-chevron-right"></i>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          // Questions View
          <div className={styles.questionsView}>
            <div className={styles.questionsHeader}>
              <button className={styles.backBtn} onClick={handleBackToCourses}>
                <i className="fa fa-arrow-left"></i>
              </button>
              <div className={styles.courseTitle}>
                <h2>{selectedCourse.toUpperCase()}</h2>
                <span>{bookmarks[selectedCourse]?.length || 0} bookmarked questions</span>
              </div>
            </div>
            
            {loadingQuestions ? (
              <div className={styles.loadingQuestions}>
                <div className={styles.spinner}></div>
                <p>Loading questions...</p>
              </div>
            ) : courseQuestions.length === 0 ? (
              <div className={styles.noQuestions}>
                <p>No questions found for this course.</p>
              </div>
            ) : (
              <>
                <div className={styles.questionsList}>
                  {courseQuestions.map((bookmark, index) => (
                    <QuestionCard
                      key={bookmark._id}
                      bookmark={bookmark}
                      index={(currentPage - 1) * 10 + index + 1}
                      onRemove={handleRemoveBookmark}
                      renderContentWithMath={renderContentWithMath}
                    />
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      className={styles.paginationBtn}
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <i className="fas fa-chevron-left"></i>
                      Previous
                    </button>
                    <div className={styles.paginationInfo}>
                      Page {currentPage} of {totalPages}
                    </div>
                    <button
                      className={styles.paginationBtn}
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Question Card Component
const QuestionCard = ({ bookmark, index, onRemove, renderContentWithMath }) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const question = bookmark.question
  const correctOptionIndex = question.correctOption - 1
  
  const handleRemoveClick = () => {
    setShowConfirmDelete(true)
  }
  
  const confirmRemove = () => {
    onRemove(question._id)
    setShowConfirmDelete(false)
  }
  
  return (
    <div className={styles.questionCard}>
      <div className={styles.questionHeader}>
        <div className={styles.questionNumber}>Question {index}</div>
        <button className={styles.removeBtn} onClick={handleRemoveClick}>
          <i className="fas fa-trash"></i>
        </button>
      </div>
      
      <div className={styles.questionContent}>
        {question.image && (
          <div className={styles.questionImage}>
            <img src={question.image} alt="Question illustration" />
          </div>
        )}
        
        <div className={styles.questionText}>
          {renderContentWithMath(question.question)}
        </div>
        
        <div className={styles.optionsContainer}>
          {question.options.map((option, optionIndex) => {
            const isCorrect = optionIndex === correctOptionIndex
            return (
              <div key={optionIndex} className={`${styles.option} ${isCorrect ? styles.correct : ""}`}>
                <div className={styles.optionLetter}>{String.fromCharCode(65 + optionIndex)}</div>
                <div className={styles.optionText}>
                  {renderContentWithMath(option)}
                </div>
                {isCorrect && <i className={`fas fa-check ${styles.optionIcon} ${styles.correctIcon}`}></i>}
              </div>
            )
          })}
        </div>
        
        <div className={styles.explanationContainer}>
          <div className={styles.explanationHeader}>
            <i className="fas fa-lightbulb"></i>
            <span>Explanation</span>
          </div>
          <div className={styles.explanationText}>
            {renderContentWithMath(question.explanation)}
          </div>
        </div>
        
        {question.tags && question.tags.length > 0 && (
          <div className={styles.tagsContainer}>
            <div className={styles.tagsHeader}>
              <i className="fas fa-tags"></i>
              <span>Tags</span>
            </div>
            <div className={styles.tagsList}>
              {question.tags.map((tag, tagIndex) => (
                <span key={tagIndex} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className={styles.questionMeta}>
          <span className={styles.courseInfo}>
            {question.course} • {question.year}
          </span>
          <span className={styles.topicInfo}>{question.topic}</span>
        </div>
      </div>
      
      {/* Confirm Delete Modal */}
      {showConfirmDelete && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Remove Bookmark</h3>
            </div>
            <div className={styles.modalBody}>
              <p>Are you sure you want to remove this question from your bookmarks?</p>
            </div>
            <div className={styles.modalFooter}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowConfirmDelete(false)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnDanger}`} onClick={confirmRemove}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Bookmarks