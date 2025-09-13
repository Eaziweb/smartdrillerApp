"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import styles from "../../styles/Notes.module.css"

const Notes = () => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [openCourse, setOpenCourse] = useState(null)
  const [completedNotes, setCompletedNotes] = useState([])
  const [totalNotes, setTotalNotes] = useState(0)
  const [progressLoading, setProgressLoading] = useState(true)

  useEffect(() => {
    loadCourses()
    loadProgress()
  }, [])

  const loadCourses = async () => {
    try {
      const response = await axios.get("/api/notes/courses", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      setCourses(response.data)
      // Calculate total notes
      const total = response.data.reduce((sum, course) => sum + course.notes.length, 0)
      setTotalNotes(total)
    } catch (error) {
      console.error("Failed to load courses:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadProgress = async () => {
    setProgressLoading(true)
    try {
      const response = await axios.get("/api/notes/progress", {
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
    setOpenCourse(openCourse === courseId ? null : courseId)
  }

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
      
      <div className={styles.progressSection}>
        <div className={styles.progressCard}>
          <div className={styles.progressInfo}>
            <div className={styles.progressStats}>
              <span className={styles.statNumber} id="completedNotes">
                {completedNotes.length}
              </span>
              <span className={styles.statTotal}>
                / <span id="totalNotes">{totalNotes}</span>
              </span>
            </div>
            <div className={styles.progressLabel}>Notes Completed</div>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${totalNotes > 0 ? (completedNotes.length / totalNotes) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>
      
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
              <div className={styles.courseHeader} onClick={() => toggleCourse(course._id)}>
                <div className={styles.courseInfo}>
                  <h3>{course.title}</h3>
                  <span className={styles.notesCount}>{course.notes.length} notes</span>
                </div>
                <i className={`fas fa-chevron-${openCourse === course._id ? "up" : "down"}`}></i>
              </div>
              {openCourse === course._id && (
                <div className={styles.notesContainer}>
                  {course.notes.map((note) => {
                    const isCompleted = completedNotes.some(id => id.toString() === note._id.toString())
                    return (
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