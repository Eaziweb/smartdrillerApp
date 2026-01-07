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
        return "#10b981" // Green
      case "B":
        return "#3b82f6" // Blue
      case "C":
        return "#f59e0b" // Yellow/Orange
      case "D":
        return "#f97316" // Orange
      case "E":
        return "#ef4444" // Red
      case "F":
        return "#6b7280" // Grey
      default:
        return "#6b7280"
    }
  }

  // Updated Logic for Grading Scale and Points
  const getGradeData = (percentage) => {
    if (percentage >= 70) {
      return { 
        grade: "A", 
        points: 5, 
        message: "Outstanding Performance!" 
      }
    } else if (percentage >= 60) {
      return { 
        grade: "B", 
        points: 4, 
        message: "Excellent Work!" 
      }
    } else if (percentage >= 50) {
      return { 
        grade: "C", 
        points: 3, 
        message: "Good Job!" 
      }
    } else if (percentage >= 45) {
      return { 
        grade: "D", 
        points: 2, 
        message: "Fair Performance!" 
      }
    } else if (percentage >= 40) {
      return { 
        grade: "E", 
        points: 1, 
        message: "Needs Improvement!" 
      }
    } else {
      return { 
        grade: "F", 
        points: 0, 
        message: "Keep Practicing!" 
      }
    }
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

  // Calculate data based on the new rules
  const gradeData = getGradeData(result.percentage)
  const gradeColor = getGradeColor(gradeData.grade)

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
          <div className={styles.scoreCircle} style={{ borderColor: gradeColor }}>
            <div className={styles.scorePercentage}>{result.percentage}%</div>
            <div className={styles.scoreGrade} style={{ color: gradeColor }}>
              Grade {gradeData.grade}
            </div>
            <div className={styles.scorePoints}>
              {gradeData.points} Points
            </div>
          </div>
          <div className={styles.scoreMessage}>{gradeData.message}</div>
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