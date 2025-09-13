"use client"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/results.module.css"

const Results = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)

  useEffect(() => {
    // Check subscription
    if (!user?.isSubscribed) {
      navigate("/home")
      return
    }
    loadResult()
  }, [user, navigate])

  const loadResult = () => {
    try {
      const storedResult = localStorage.getItem("latestResult")
      if (!storedResult) {
        navigate("/home")
        return
      }
      const resultData = JSON.parse(storedResult)
      setResult(resultData)
      setLoading(false)
    } catch (error) {
      console.error("Failed to load result:", error)
      navigate("/home")
    }
  }

  const getGradeColor = (grade) => {
    switch (grade) {
      case "A":
        return "#10b981"
      case "B":
        return "#3b82f6"
      case "C":
        return "#f59e0b"
      case "D":
        return "#ef4444"
      case "E":
        return "#8b5cf6"
      case "F":
        return "#6b7280"
      default:
        return "#6b7280"
    }
  }

  const getGradeMessage = (grade, percentage) => {
    if (percentage >= 90) return "Outstanding Performance!"
    if (percentage >= 80) return "Excellent Work!"
    if (percentage >= 70) return "Good Job!"
    if (percentage >= 60) return "Well Done!"
    if (percentage >= 50) return "Keep Practicing!"
    return "Need More Practice"
  }

  const handleViewCorrection = () => {
    navigate("/correction")
  }

  const handleBackToHome = () => {
    // Clear the latest result
    localStorage.removeItem("latestResult")
    navigate("/home")
  }

  if (loading || !result) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading results...</p>
      </div>
    )
  }

  return (
    <div className={styles.resultsPage}>
      {/* Header */}
      <div className={styles.resultsHeader}>
        <button className={styles.backBtn} onClick={handleBackToHome}>
          <i className="fa fa-arrow-left"></i>
        </button>
        <h1>Mock Test Results</h1>
      </div>
      
      {/* Results Container */}
      <div className={styles.resultsContainer}>
        {/* Score Circle */}
        <div className={styles.scoreSection}>
          <div className={styles.scoreCircle} style={{ borderColor: getGradeColor(result.grade) }}>
            <div className={styles.scorePercentage}>{result.percentage}%</div>
            <div className={styles.scoreGrade} style={{ color: getGradeColor(result.grade) }}>
              Grade {result.grade}
            </div>
          </div>
          <div className={styles.scoreMessage}>{getGradeMessage(result.grade, result.percentage)}</div>
        </div>
        
        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.total}`}>
            <div className={styles.statIcon}>
              <i className="fas fa-list"></i>
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{result.totalQuestions}</div>
              <div className={styles.statLabel}>Total Questions</div>
            </div>
          </div>
          
          <div className={`${styles.statCard} ${styles.correct}`}>
            <div className={styles.statIcon}>
              <i className="fas fa-check"></i>
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{result.correctAnswers}</div>
              <div className={styles.statLabel}>Correct</div>
            </div>
          </div>
          
          <div className={`${styles.statCard} ${styles.wrong}`}>
            <div className={styles.statIcon}>
              <i className="fas fa-times"></i>
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{result.wrongAnswers}</div>
              <div className={styles.statLabel}>Wrong</div>
            </div>
          </div>
          
          <div className={`${styles.statCard} ${styles.unanswered}`}>
            <div className={styles.statIcon}>
              <i className="fas fa-question"></i>
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{result.unansweredQuestions}</div>
              <div className={styles.statLabel}>Unanswered</div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleViewCorrection}>
            <i className="fas fa-eye"></i>
            View Correction
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleBackToHome}>
            <i className="fas fa-home"></i>
            Back to Home
          </button>
        </div>
        
        {/* Performance Breakdown */}
        <div className={styles.performanceSection}>
          <h3>Performance Breakdown</h3>
          <div className={styles.performanceBar}>
            <div
              className={`${styles.performanceSegment} ${styles.correct}`}
              style={{ width: `${(result.correctAnswers / result.totalQuestions) * 100}%` }}
            ></div>
            <div
              className={`${styles.performanceSegment} ${styles.wrong}`}
              style={{ width: `${(result.wrongAnswers / result.totalQuestions) * 100}%` }}
            ></div>
            <div
              className={`${styles.performanceSegment} ${styles.unanswered}`}
              style={{ width: `${(result.unansweredQuestions / result.totalQuestions) * 100}%` }}
            ></div>
          </div>
          <div className={styles.performanceLegend}>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.correct}`}></div>
              <span>Correct ({result.correctAnswers})</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.wrong}`}></div>
              <span>Wrong ({result.wrongAnswers})</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.unanswered}`}></div>
              <span>Unanswered ({result.unansweredQuestions})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Results