"use client"
import { useState, useEffect } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import styles from "../../styles/CompetitionDetails.module.css"

const CompetitionDetails = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [competition, setCompetition] = useState(null)
  const [participation, setParticipation] = useState(null)
  const [selectedCourses, setSelectedCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState({ show: false, message: "", type: "" })

  useEffect(() => {
    fetchCompetitionDetails()
    checkParticipation()
  }, [id])

  const fetchCompetitionDetails = async () => {
    try {
      const response = await axios.get(`/api/competitions/${id}`)
      setCompetition(response.data)
    } catch (error) {
      console.error("Error fetching competition:", error)
      const errorMessage = error.response?.data?.message || "Failed to fetch competition details"
      setError(errorMessage)
      showToast(errorMessage, "error")
    } finally {
      setLoading(false)
    }
  }

  const checkParticipation = async () => {
    try {
      const response = await axios.get(`/api/competitions/${id}/participation`)
      setParticipation(response.data)
    } catch (error) {
      console.error("Error checking participation:", error)
    }
  }

  const handleCourseToggle = (courseCode) => {
    if (!competition) return
    
    const requiredCourses = competition.requiredCourses || 1
    
    setSelectedCourses((prev) => {
      if (prev.includes(courseCode)) {
        return prev.filter((code) => code !== courseCode)
      } else if (prev.length < requiredCourses) {
        return [...prev, courseCode]
      } else {
        showToast(`You can only select ${requiredCourses} courses`, "warning")
        return prev
      }
    })
  }

  const calculateTotalTime = () => {
    if (!competition) return 0
    return selectedCourses.reduce((total, courseCode) => {
      const course = competition.courses?.find((c) => c.courseCode === courseCode)
      return total + (course?.timeAllowed || 0)
    }, 0)
  }

  const calculateTotalQuestions = () => {
    if (!competition) return 0
    return selectedCourses.reduce((total, courseCode) => {
      const course = competition.courses?.find((c) => c.courseCode === courseCode)
      return total + (course?.questionsToShow || 0)
    }, 0)
  }

  const handleStartCompetition = async () => {
    if (!competition) return
    
    const requiredCourses = competition.requiredCourses || 1
    
    if (selectedCourses.length !== requiredCourses) {
      showToast(`Please select exactly ${requiredCourses} courses`, "warning")
      return
    }
    
    setSubmitting(true)
    try {
      const response = await axios.post(`/api/competitions/${id}/questions`, {
        selectedCourses,
      })
      
      // Store competition data for the quiz
      const competitionData = {
        competitionId: id,
        competitionName: competition.name,
        questions: response.data.questions,
        selectedCourses,
        totalTime: response.data.totalTime,
        examType: "competition",
      }
      
      localStorage.setItem("currentCompetition", JSON.stringify(competitionData))
      navigate("/competition-quiz")
    } catch (error) {
      console.error("Error starting competition:", error)
      const errorMessage = error.response?.data?.message || "Failed to start competition"
      showToast(errorMessage, "error")
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const getTimeRemaining = (endDate) => {
    const now = new Date()
    const end = new Date(endDate)
    const diff = end - now
    if (diff <= 0) return "Ended"
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (days > 0) return `${days}d ${hours}h remaining`
    if (hours > 0) return `${hours}h ${minutes}m remaining`
    return `${minutes}m remaining`
  }

  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000)
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading competition...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h3>{error}</h3>
        <Link to="/competitions" className={`${styles.btn} ${styles.btnPrimary}`}>
          Back to Competitions
        </Link>
      </div>
    )
  }

  if (!competition) {
    return (
      <div className={styles.errorContainer}>
        <h3>Competition not found</h3>
        <Link to="/competitions" className={`${styles.btn} ${styles.btnPrimary}`}>
          Back to Competitions
        </Link>
      </div>
    )
  }

  // If user already participated, show completion message
  if (participation?.hasParticipated) {
    return (
      <div className={styles.competitionCompleted}>
        <div className={styles.completionCard}>
          <div className={styles.completionIcon}>
            <i className="fas fa-check-circle"></i>
          </div>
          <h2>Competition Completed!</h2>
          <p>You have successfully participated in this competition.</p>
          <div className={styles.completionStats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Your Score</span>
              <span className={styles.statValue}>{participation.submission?.totalScore || 0}%</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Correct Answers</span>
              <span className={styles.statValue}>
                {participation.submission?.correctAnswers || 0}/{participation.submission?.totalQuestions || 0}
              </span>
            </div>
          </div>
          <div className={styles.completionActions}>
            <Link to="/competitions" className={`${styles.btn} ${styles.btnSecondary}`}>
              Back to Competitions
            </Link>
            {competition.status === "ended" && (
              <Link to={`/competitions/${id}/leaderboard`} className={`${styles.btn} ${styles.btnPrimary}`}>
                <i className="fas fa-trophy"></i>
                View Leaderboard
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  const requiredCourses = competition.requiredCourses || 1

  return (
    <div className={styles.competitionDetailsPage}>
      {/* Toast notification */}
      {toast.show && (
        <div className={`${styles.messageToast} ${styles[toast.type]}`}>
          <i className={`fas ${toast.type === "success" ? "fa-check-circle" : toast.type === "error" ? "fa-exclamation-triangle" : "fa-info-circle"}`}></i>
          <span>{toast.message}</span>
        </div>
      )}
      
      <div className={styles.pageHeader}>
        <Link to="/competitions" className={styles.backBtn}>
          <i className="fas fa-arrow-left"></i>
        </Link>
        <div className={styles.headerContent}>
          <h1>{competition.name}</h1>
          <div className={styles.competitionStatus}>
            <span className={`${styles.statusBadge} ${styles[`status${competition.status}`]}`}>
              {competition.status.toUpperCase()}
            </span>
            {competition.status === "active" && (
              <span className={styles.timeRemaining}>
                <i className="fas fa-hourglass-half"></i>
                {getTimeRemaining(competition.endDate)}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className={styles.competitionContent}>
        <div className={styles.competitionInfo}>
          <div className={styles.infoSection}>
            <h3>Description</h3>
            <p>{competition.description}</p>
          </div>
          
          {competition.instructions && (
            <div className={styles.infoSection}>
              <h3>Instructions</h3>
              <div className={styles.instructions} dangerouslySetInnerHTML={{ __html: competition.instructions }}></div>
            </div>
          )}
          
          <div className={styles.infoSection}>
            <h3>Competition Details</h3>
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <i className="fas fa-calendar-start"></i>
                <div>
                  <span className={styles.detailLabel}>Start Time</span>
                  <span className={styles.detailValue}>{formatDate(competition.startDate)}</span>
                </div>
              </div>
              <div className={styles.detailItem}>
                <i className="fas fa-calendar-end"></i>
                <div>
                  <span className={styles.detailLabel}>End Time</span>
                  <span className={styles.detailValue}>{formatDate(competition.endDate)}</span>
                </div>
              </div>
              <div className={styles.detailItem}>
                <i className="fas fa-users"></i>
                <div>
                  <span className={styles.detailLabel}>Participants</span>
                  <span className={styles.detailValue}>{competition.totalParticipants || 0}</span>
                </div>
              </div>
              <div className={styles.detailItem}>
                <i className="fas fa-book"></i>
                <div>
                  <span className={styles.detailLabel}>Required Courses</span>
                  <span className={styles.detailValue}>
                    {requiredCourses} out of {competition.courses?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {competition.status === "active" && competition.courses && competition.courses.length > 0 && (
          <div className={styles.courseSelection}>
            <h3>Select Your Courses</h3>
            <p>Choose {requiredCourses} course{requiredCourses > 1 ? 's' : ''} from the available options:</p>
            
            <div className={styles.coursesGrid}>
              {competition.courses.map((course) => (
                <div
                  key={course.courseCode}
                  className={`${styles.courseOption} ${selectedCourses.includes(course.courseCode) ? styles.selected : ""}`}
                  onClick={() => handleCourseToggle(course.courseCode)}
                >
                  <div className={styles.courseHeader}>
                    <h4>{course.courseCode}</h4>
                    <div className={styles.selectionIndicator}>
                      {selectedCourses.includes(course.courseCode) && <i className="fas fa-check"></i>}
                    </div>
                  </div>
                  <p>{course.courseName}</p>
                  <div className={styles.courseStats}>
                    <span>
                      <i className="fas fa-question-circle"></i>
                      {course.questionsToShow || 0} questions
                    </span>
                    <span>
                      <i className="fas fa-clock"></i>
                      {course.timeAllowed || 0} minutes
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedCourses.length > 0 && (
              <div className={styles.selectionSummary}>
                <h4>Your Selection Summary</h4>
                <div className={styles.summaryStats}>
                  <div className={styles.summaryItem}>
                    <i className="fas fa-book"></i>
                    <span>{selectedCourses.length} course{selectedCourses.length > 1 ? 's' : ''} selected</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <i className="fas fa-question-circle"></i>
                    <span>{calculateTotalQuestions()} total questions</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <i className="fas fa-clock"></i>
                    <span>{calculateTotalTime()} minutes total time</span>
                  </div>
                </div>
                
                <button
                  className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg} ${styles.startCompetitionBtn}`}
                  onClick={handleStartCompetition}
                  disabled={selectedCourses.length !== requiredCourses || submitting}
                >
                  {submitting ? (
                    <>
                      <div className={styles.spinnerSm}></div>
                      Starting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-play"></i>
                      Start Competition
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
        
        {competition.status === "upcoming" && (
          <div className={styles.upcomingMessage}>
            <i className="fas fa-clock"></i>
            <h3>Competition Not Started</h3>
            <p>This competition will start on {formatDate(competition.startDate)}</p>
          </div>
        )}
        
        {competition.status === "ended" && (
          <div className={styles.endedMessage}>
            <i className="fas fa-trophy"></i>
            <h3>Competition Ended</h3>
            <p>This competition ended on {formatDate(competition.endDate)}</p>
            <Link to={`/competitions/${id}/leaderboard`} className={`${styles.btn} ${styles.btnPrimary}`}>
              <i className="fas fa-trophy"></i>
              View Leaderboard
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default CompetitionDetails