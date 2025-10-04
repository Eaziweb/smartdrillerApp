"use client"
import { useState, useEffect, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/Notes.module.css"
import api from "../../utils/api"

const Notes = () => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [openCourse, setOpenCourse] = useState(null)
  const [completedNotes, setCompletedNotes] = useState([])
  const [progressLoading, setProgressLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadCourses()
    if (user?.isSubscribed) {
      loadProgress()
    }
  }, [user])

  const loadCourses = async () => {
    try {
      const response = await api.get("/api/notes/courses", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      setCourses(response.data)
    } catch (error) {
      console.error("Failed to load courses:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadProgress = async () => {
    setProgressLoading(true)
    try {
      const response = await api.get("/api/notes/progress", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      setCompletedNotes(response.data.completedNotes || [])
    } catch (error) {
      console.error("Failed to load progress:", error)
    } finally {
      setProgressLoading(false)
    }
  }

  const toggleCourse = (courseId) => {
    if (!user?.isSubscribed) {
      navigate("/subscription-required")
      return
    }
    setOpenCourse(openCourse === courseId ? null : courseId)
  }

  // Calculate total notes and completed notes from visible courses only
  const { totalVisibleNotes, completedVisibleCount } = useMemo(() => {
    let total = 0
    const visibleNoteIds = new Set()
    
    courses.forEach(course => {
      total += course.notes.length
      course.notes.forEach(note => {
        visibleNoteIds.add(note._id.toString())
      })
    })
    
    const completedCount = completedNotes.filter(id => 
      visibleNoteIds.has(id.toString())
    ).length
    
    return { totalVisibleNotes: total, completedVisibleCount: completedCount }
  }, [courses, completedNotes])

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.notes.some((note) => note.title.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (loading) {
    return (
      <div className={styles.notesPage}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Loading notes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.notesPage}>
      <header className={styles.notesHeader}>
        <div className={styles.headerContent}>
          <Link to="/home" className={styles.backBtn}>
            <i className="fas fa-arrow-left"></i>
          </Link>
          <h1>Study Notes</h1>
        </div>
      </header>
      
      {/* Subscription banner for unsubscribed users */}
      {!user?.isSubscribed && (
        <div className={styles.subscriptionBanner}>
          <div className={styles.bannerContent}>
            <i className="fas fa-lock"></i>
            <p>Subscribe to access study notes and track your progress</p>
            <button 
              className={styles.subscribeBtn}
              onClick={() => navigate("/subscription-required")}
            >
              Subscribe Now
            </button>
          </div>
        </div>
      )}
      
      {/* Only show progress section for subscribed users */}
      {user?.isSubscribed && (
        <div className={styles.progressSection}>
          <div className={styles.progressCard}>
            <div className={styles.progressInfo}>
              <div className={styles.progressStats}>
                <span className={styles.statNumber} id="completedNotes">
                  {completedVisibleCount}
                </span>
                <span className={styles.statTotal}>
                  / <span id="totalNotes">{totalVisibleNotes}</span>
                </span>
              </div>
              <div className={styles.progressLabel}>Notes Completed</div>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${totalVisibleNotes > 0 ? (completedVisibleCount / totalVisibleNotes) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
      
      <div className={styles.searchSection}>
        <div className={styles.searchBar}>
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className={styles.clearSearch} onClick={() => setSearchTerm("")}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      </div>
      
      <div className={styles.coursesContainer}>
        {filteredCourses.length === 0 ? (
          <div className={styles.noResults}>
            <i className="fas fa-search"></i>
            <p>No notes found matching your search</p>
          </div>
        ) : (
          filteredCourses.map((course) => (
            <div key={course._id} className={styles.courseItem}>
              <div 
                className={`${styles.courseHeader} ${!user?.isSubscribed ? styles.disabled : ''}`} 
                onClick={() => toggleCourse(course._id)}
              >
                <div className={styles.courseInfo}>
                  <h3>{course.title}</h3>
                  <span className={styles.notesCount}>{course.notes.length} notes</span>
                </div>
                <div className={styles.courseHeaderActions}>
                  {!user?.isSubscribed && (
                    <i className={`fas fa-lock ${styles.lockIcon}`}></i>
                  )}
                  <i className={`fas fa-chevron-${openCourse === course._id ? "up" : "down"}`}></i>
                </div>
              </div>
              
              {openCourse === course._id && (
                <div className={styles.notesContainer}>
                  {course.notes.map((note) => {
                    const isCompleted = completedNotes.some(id => id.toString() === note._id.toString())
                    
                    return user?.isSubscribed ? (
                      <Link key={note._id} to={`/note-reader/${note._id}`} className={styles.noteCard}>
                        <div className={styles.noteContent}>
                          <h4>{note.title}</h4>
                          <p>{note.description}</p>
                          <div className={styles.noteMeta}>
                            <span className={styles.noteDate}>{new Date(note.createdAt).toLocaleDateString()}</span>
                            {isCompleted && (
                              <span className={styles.completedBadge}>
                                <i className="fas fa-check-circle"></i>
                                Completed
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={styles.noteArrow}>
                          <i className="fas fa-chevron-right"></i>
                        </div>
                      </Link>
                    ) : (
                      <div 
                        key={note._id} 
                        className={`${styles.noteCard} ${styles.disabledNoteCard}`}
                        onClick={() => navigate("/subscription-required")}
                      >
                        <div className={styles.noteContent}>
                          <h4>{note.title}</h4>
                          <p>{note.description}</p>
                          <div className={styles.noteMeta}>
                            <span className={styles.noteDate}>{new Date(note.createdAt).toLocaleDateString()}</span>
                            <span className={styles.lockBadge}>
                              <i className="fas fa-lock"></i>
                              Subscribe to access
                            </span>
                          </div>
                        </div>
                        <div className={styles.noteArrow}>
                          <i className="fas fa-lock"></i>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Notes