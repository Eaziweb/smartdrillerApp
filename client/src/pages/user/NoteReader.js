// components/NoteReader.js
"use client"
import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import styles from "../../styles/NoteReader.module.css"

const NoteReader = () => {
  const { noteId } = useParams()
  const { user, getCurrentToken } = useAuth()
  const [note, setNote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isCompleted, setIsCompleted] = useState(false)
  const [progressLoading, setProgressLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Get auth token
  const getAuthHeaders = () => {
    const token = getCurrentToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  useEffect(() => {
    loadNote()
    checkCompletion()
  }, [noteId])

  // Load MathJax script when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if MathJax is already loaded
      if (!window.MathJax) {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'
        script.async = true
        script.id = 'MathJax-script'
        document.head.appendChild(script)
        
        // Configure MathJax
        window.MathJax = {
          tex: {
            inlineMath: [['$', '$'], ['\\(', '\\)']],
            displayMath: [['$$', '$$'], ['\\[', '\\]']]
          }
        }
      } else {
        // If MathJax is already loaded, just render the math
        renderMathInElement()
      }
    }
    
    return () => {
      // Clean up if needed
    }
  }, [])

  // Render math when note content changes
  useEffect(() => {
    if (note && note.content) {
      renderMathInElement()
    }
  }, [note])

  const renderMathInElement = () => {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise()
        .then(() => {
          console.log('MathJax rendering complete')
        })
        .catch((err) => console.log('MathJax rendering error:', err.message))
    }
  }

  const loadNote = async () => {
    try {
      const response = await axios.get(`/api/notes/${noteId}`, {
        headers: getAuthHeaders()
      })
      setNote(response.data)
    } catch (error) {
      console.error("Failed to load note:", error)
      if (error.response?.status === 401) {
        setError("Unauthorized access. Please log in again.")
      } else {
        setError("Failed to load note. Please try again later.")
      }
    } finally {
      setLoading(false)
    }
  }

  const checkCompletion = async () => {
    setProgressLoading(true)
    try {
      const response = await axios.get("/api/notes/progress", {
        headers: getAuthHeaders()
      })
      // Convert both to strings for comparison
      const completed = response.data.completedNotes.some(id => id.toString() === noteId)
      setIsCompleted(completed)
    } catch (error) {
      console.error("Failed to check completion:", error)
    } finally {
      setProgressLoading(false)
    }
  }

  const markAsCompleted = async () => {
    try {
      await axios.post(
        `/api/notes/${noteId}/complete`,
        {},
        {
          headers: getAuthHeaders()
        },
      )
      setIsCompleted(true)
      // Show success message
      const toast = document.createElement("div")
      toast.className = styles.completionToast
      toast.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>Note marked as completed!</span>
      `
      document.body.appendChild(toast)
      setTimeout(() => {
        toast.classList.add(styles.show)
      }, 100)
      setTimeout(() => {
        toast.classList.remove(styles.show)
        setTimeout(() => document.body.removeChild(toast), 300)
      }, 3000)
    } catch (error) {
      console.error("Failed to mark as completed:", error)
    }
  }

  // Watermark component
  const Watermark = () => {
    if (!user) return null
    
    const watermarkText = `${user.fullName} - ${user.email}`
    
    return (
      <div className={styles.watermarkContainer}>
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className={styles.watermarkItem}>
            {watermarkText}
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.noteReader}>
        <div className={styles.errorMessage}>
          <h2>{error}</h2>
          <Link to="/notes" className={styles.backLink}>
            ← Back to Notes
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.noteReader}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Loading note...</p>
        </div>
      </div>
    )
  }

  if (!note) {
    return (
      <div className={styles.noteReader}>
        <div className={styles.errorMessage}>
          <h2>Note not found</h2>
          <Link to="/notes" className={styles.backLink}>
            ← Back to Notes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.noteReader}>
      <Watermark />
      <header className={styles.noteHeader}>
        <div className={styles.headerContent}>
          <Link to="/notes" className={styles.backBtn}>
            <i className="fas fa-arrow-left"></i>
          </Link>
          <div className={styles.noteTitleSection}>
            <h1>{note.title}</h1>
            <span className={styles.courseName}>{note.course?.title}</span>
          </div>
          {isCompleted && (
            <div className={styles.completedIndicator}>
              <i className="fas fa-check-circle"></i>
              <span>Completed</span>
            </div>
          )}
        </div>
      </header>
      <main className={styles.noteContent}>
        <div className={styles.contentContainer}>
          <div className={styles.noteMeta}>
            <div className={styles.metaItem}>
              <i className="fas fa-calendar"></i>
              <span>{new Date(note.createdAt).toLocaleDateString()}</span>
            </div>
            <div className={styles.metaItem}>
              <i className="fas fa-book"></i>
              <span>{note.course?.title}</span>
            </div>
          </div>
          {note.description && (
            <div className={styles.noteDescription}>
              <p>{note.description}</p>
            </div>
          )}
          <div className={styles.noteBody} dangerouslySetInnerHTML={{ __html: note.content }} />
          {!isCompleted && !progressLoading && (
            <div className={styles.completionSection}>
              <button className={styles.completeBtn} onClick={markAsCompleted}>
                <i className="fas fa-check"></i>
                Mark as Completed
              </button>
            </div>
          )}
          {progressLoading && (
            <div className={styles.completionSection}>
              <p>Loading completion status...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default NoteReader