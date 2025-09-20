"use client"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/ResultsHistory.module.css"
import api from "../../utils/api";

const ResultsHistory = () => {
  const [results, setResults] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState("all")
  const [sortBy, setSortBy] = useState("date")
  const [currentPage, setCurrentPage] = useState(1)
  const resultsPerPage = 10
  const { user } = useAuth()
  const navigate = useNavigate()

  const fetchResults = async () => {
    try {
      setLoading(true)
      setError("")
      const token = localStorage.getItem("token")
      if (!token) {
        setError("Authentication required")
        return
      }
      
      const response = await api.get("/results/history", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      const data = response.data
      setResults(data.results || [])
      setStats(data.stats || {})
    } catch (error) {
      console.error("Error fetching results:", error)
      setError(error.response?.data?.message || error.message || "Failed to load results history")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && user.isSubscribed) {
      fetchResults()
    }
  }, [currentPage])

  const getScoreColor = (percentage) => {
    if (percentage >= 70) return "#10b981"
    if (percentage >= 50) return "#f59e0b"
    return "#ef4444"
  }

  const getGrade = (percentage) => {
    if (percentage >= 90) return "A+"
    if (percentage >= 70) return "A"
    if (percentage >= 70) return "B"
    if (percentage >= 60) return "C"
    if (percentage >= 50) return "D"
    return "F"
  }

  const formatTime = (timeInMinutes) => {
    if (!timeInMinutes || timeInMinutes === 0) return "0m"
    const hours = Math.floor(timeInMinutes / 60)
    const minutes = timeInMinutes % 60
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatDate = (dateString) => {
    try {
      if (!dateString) return "Unknown date"
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      console.error("Date formatting error:", error)
      return "Invalid date"
    }
  }
 
  // Filter and sort results
  const filteredResults = results.filter((result) => {
    if (!result) return false
    if (filter === "all") return true
    return result.course && result.course.toLowerCase() === filter.toLowerCase()
  })

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (!a || !b) return 0
    switch (sortBy) {
      case "date":
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      case "score":
        return (b.percentage || 0) - (a.percentage || 0)
      case "course":
        return (a.course || "").localeCompare(b.course || "")
      default:
        return 0
    }
  })

  // Pagination
  const totalPages = Math.ceil(sortedResults.length / resultsPerPage)
  const startIndex = (currentPage - 1) * resultsPerPage
  const endIndex = startIndex + resultsPerPage
  const currentResults = sortedResults.slice(startIndex, endIndex)

  // Get unique courses for filter
  const courses = [
    ...new Set(results.map((result) => result?.course).filter((course) => course && typeof course === "string")),
  ]

  // Loading state
  if (loading) {
    return (
      <div className={styles.resultsHistoryPage}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading results history...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={styles.resultsHistoryPage}>
        <div className={styles.historyHeader}>
          <button onClick={() => navigate("/home")} className={styles.backBtn}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2>Results History</h2>
        </div>
        <div className={styles.errorContainer}>
          <div className={styles.errorCard}>
            <div className={styles.errorIcon}>
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3 className={styles.errorTitle}>Error Loading Results</h3>
            <p className={styles.errorMessage}>{error}</p>
            <div className={styles.errorActions}>
              <button onClick={fetchResults} className={`${styles.btn} ${styles.btnPrimary}`}>
                Try Again
              </button>
              <button onClick={() => navigate("/home")} className={`${styles.btn} ${styles.btnSecondary}`}>
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.resultsHistoryPage}>
      <div className={styles.historyHeader}>
        <button onClick={() => navigate("/home")} className={styles.backBtn}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>Results History</h2>
      </div>
      
      {results.length === 0 ? (
        <div className={styles.noResults}>
          <div className={styles.noResultsIcon}>
            <i className="fas fa-chart-line"></i>
          </div>
          <h3>No Test Results Yet</h3>
          <p>Take your first mock test to see your performance history.</p>
          <button onClick={() => navigate("/home")} className={`${styles.btn} ${styles.btnPrimary}`}>
            Start Testing
          </button>
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className={styles.statsSummary}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.totalQuizzes || results.length}</div>
              <div className={styles.statLabel}>Total Tests</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.averageScore || 0}%</div>
              <div className={styles.statLabel}>Average Score</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.bestScore || 0}%</div>
              <div className={styles.statLabel}>Best Score</div>
            </div>
          </div>
          
          {/* Filters and Sort */}
          <div className={styles.controls}>
            <div className={styles.filterControls}>
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All Subjects</option>
                {courses.map((course) => (
                  <option key={course} value={course}>
                    {course.toUpperCase()}
                  </option>
                ))}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="date">Sort by Date</option>
                <option value="score">Sort by Score</option>
                <option value="course">Sort by Subject</option>
              </select>
            </div>
            <div className={styles.resultsInfo}>
              Showing {startIndex + 1}-{Math.min(endIndex, sortedResults.length)} of {sortedResults.length} results
            </div>
          </div>
          
          {/* Results List */}
          <div className={styles.resultsList}>
            {currentResults.map((result) => {
              if (!result || !result._id) return null
              const percentage = result.percentage || 0
              const scoreColor = getScoreColor(percentage)
              const grade = getGrade(percentage)
              
              return (
                <div key={result._id} className={styles.resultItem}>
                  <div className={styles.resultScore}>
                    <div className={styles.scoreCircleSmall} style={{ borderColor: scoreColor }}>
                      <span style={{ color: scoreColor }}>{percentage}%</span>
                    </div>
                    <div className={styles.grade}>{grade}</div>
                  </div>
                  <div className={styles.resultDetails}>
                    <div className={styles.resultTitle}>
                      <h4>
                        {(result.course || "Unknown").toUpperCase()} - {result.year || "N/A"}
                      </h4>
                      <span className={styles.resultDate}>{formatDate(result.createdAt)}</span>
                    </div>
                    <div className={styles.resultStats}>
                      <span className={styles.stat}>
                        <i className="fas fa-check-circle"></i>
                        {result.correctAnswers || 0}/{result.totalQuestions || 0} correct
                      </span>
                      <span className={styles.stat}>
                        <i className="fas fa-clock"></i>
                        {formatTime(result.timeUsed)}
                      </span>
                      {result.topics && result.topics.length > 0 && (
                        <span className={styles.stat}>
                          <i className="fas fa-book"></i>
                          {result.topics.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.paginationBtn}
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <i className="fas fa-chevron-left"></i>
                Previous
              </button>
              <div className={styles.paginationInfo}>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
              </div>
              <button
                className={styles.paginationBtn}
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
  )
}

export default ResultsHistory