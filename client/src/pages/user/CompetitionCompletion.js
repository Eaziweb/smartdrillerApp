"use client"
import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import styles from "../../styles/CompetitionCompletion.module.css"

const CompetitionCompletion = () => {
  const navigate = useNavigate()
  const [competitionResult, setCompetitionResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get competition result from localStorage
    const result = localStorage.getItem("competitionResult")
    if (result) {
      setCompetitionResult(JSON.parse(result))
      // Clear the result from localStorage
      localStorage.removeItem("competitionResult")
    } else {
      // If no result found, redirect to competitions
      navigate("/competitions")
    }
    setLoading(false)
  }, [navigate])

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading results...</p>
      </div>
    )
  }

  if (!competitionResult) {
    return (
      <div className={styles.errorContainer}>
        <h3>No results found</h3>
        <Link to="/competitions" className={`${styles.btn} ${styles.btnPrimary}`}>
          Back to Competitions
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.competitionCompletionPage}>
      <div className={styles.completionContainer}>
        <div className={styles.completionHeader}>
          <div className={styles.completionIcon}>
            <i className="fas fa-check-circle"></i>
          </div>
          <h1>Competition Completed!</h1>
          <p>You have successfully submitted your answers</p>
        </div>
        
        <div className={styles.completionStats}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-percentage"></i>
            </div>
            <div className={styles.statContent}>
              <h3>{competitionResult.totalScore}%</h3>
              <p>Overall Score</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-check"></i>
            </div>
            <div className={styles.statContent}>
              <h3>
                {competitionResult.correctAnswers}/{competitionResult.totalQuestions}
              </h3>
              <p>Correct Answers</p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-book"></i>
            </div>
            <div className={styles.statContent}>
              <h3>{competitionResult.courseScores?.length || 0}</h3>
              <p>Courses Completed</p>
            </div>
          </div>
        </div>
        
        {competitionResult.courseScores && competitionResult.courseScores.length > 0 && (
          <div className={styles.courseBreakdown}>
            <h3>Course Breakdown</h3>
            <div className={styles.courseScores}>
              {competitionResult.courseScores.map((course, index) => (
                <div key={index} className={styles.courseScoreCard}>
                  <div className={styles.courseInfo}>
                    <h4>{course.courseCode}</h4>
                    <p>{course.courseName}</p>
                  </div>
                  <div className={styles.courseStats}>
                    <div className={styles.scoreCircle}>
                      <span className={styles.scoreValue}>{course.score}%</span>
                    </div>
                    <div className={styles.scoreDetails}>
                      <span>
                        {course.correctAnswers}/{course.totalQuestions} correct
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className={styles.leaderboardInfo}>
          <div className={styles.infoCard}>
            <i className="fas fa-trophy"></i>
            <div>
              <h4>Leaderboard Available Soon</h4>
              <p>Check back in 30 minutes after the competition ends to see your ranking on the leaderboard.</p>
            </div>
          </div>
        </div>
        
        <div className={styles.completionActions}>
          <Link to="/competitions" className={`${styles.btn} ${styles.btnSecondary}`}>
            <i className="fas fa-arrow-left"></i>
            Back to Competitions
          </Link>
          <Link to="/home" className={`${styles.btn} ${styles.btnPrimary}`}>
            <i className="fas fa-home"></i>
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default CompetitionCompletion