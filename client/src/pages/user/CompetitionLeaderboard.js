"use client"
import { useState, useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import styles from "../../styles/CompetitionLeaderboard.module.css"


const CompetitionLeaderboard = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const [competition, setCompetition] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    course: "",
    sortBy: "score",
    page: 1,
    limit: 50,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [pagination, setPagination] = useState(null)
  const [availableCourses, setAvailableCourses] = useState([])

  useEffect(() => {
    fetchCompetition()
    fetchLeaderboard()
  }, [id, filters])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== filters.searchTerm) {
        setFilters((prev) => ({ ...prev, searchTerm, page: 1 }))
      }
    }, 500)
    return () => clearTimeout(delayedSearch)
  }, [searchTerm])

  const fetchCompetition = async () => {
    try {
      const response = await axios.get(`/api/competitions/${id}`)
      setCompetition(response.data)
      // Extract available courses for filtering
      const courses =
        response.data.courses?.map((course) => ({
          code: course.courseCode,
          name: course.courseName,
        })) || []
      setAvailableCourses(courses)
    } catch (error) {
      console.error("Error fetching competition:", error)
      showMessage("Failed to fetch competition details", "error")
    }
  }

  const fetchLeaderboard = async () => {
    try {
      const params = new URLSearchParams({
        sortBy: filters.sortBy,
        page: filters.page.toString(),
        limit: filters.limit.toString(),
      })
      if (filters.course) params.append("course", filters.course)
      if (filters.searchTerm) params.append("search", filters.searchTerm)
      const response = await axios.get(`/api/competitions/${id}/leaderboard?${params}`)
      setLeaderboard(response.data.leaderboard)
      setStats(response.data.stats)
      setPagination(response.data.pagination)
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
      if (error.response?.status === 400) {
        showMessage(error.response.data.message, "warning")
      } else {
        showMessage("Failed to fetch leaderboard", "error")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key !== "page" ? 1 : value, // Reset to page 1 when changing filters
    }))
  }

  const handleRefresh = () => {
    setLoading(true)
    fetchLeaderboard()
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const getRankDisplay = (rank) => {
    if (rank === 1) return "🥇"
    if (rank === 2) return "🥈"
    if (rank === 3) return "🥉"
    return `#${rank}`
  }

  const showMessage = (message, type = "info") => {
    const messageEl = document.createElement("div")
    messageEl.className = `${styles.messageToast} ${styles[type]}`
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

  if (loading && !leaderboard.length) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading leaderboard...</p>
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

  return (
    <div className={styles.leaderboardPage}>
      <div className={styles.pageHeader}>
        <Link to="/competitions" className={styles.backBtn}>
          <i className="fas fa-arrow-left"></i>
        </Link>
        <div className={styles.headerContent}>
          <h1>{competition.name} - Leaderboard</h1>
          <div className={styles.competitionInfo}>
            <span className={`${styles.statusBadge} ${styles[`status${competition.status}`]}`}>
              {competition.status.toUpperCase()}
            </span>
            <span className={styles.competitionDate}>Ended: {formatDate(competition.endDate)}</span>
          </div>
        </div>
        <button className={styles.refreshBtn} onClick={handleRefresh} disabled={loading}>
          <i className={`fas fa-sync-alt ${loading ? "fa-spin" : ""}`}></i>
          Refresh
        </button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className={styles.leaderboardStats}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-users"></i>
            </div>
            <div className={styles.statContent}>
              <h3>{stats.totalParticipants}</h3>
              <p>Total Participants</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-chart-line"></i>
            </div>
            <div className={styles.statContent}>
              <h3>{stats.averageScore}%</h3>
              <p>Average Score</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-trophy"></i>
            </div>
            <div className={styles.statContent}>
              <h3>{stats.highestScore}%</h3>
              <p>Highest Score</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-medal"></i>
            </div>
            <div className={styles.statContent}>
              <h3>{stats.userRank || "-"}</h3>
              <p>Your Rank</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={styles.leaderboardFilters}>
        <div className={styles.filterGroup}>
          <label htmlFor="courseFilter">Filter by Course:</label>
          <select
            id="courseFilter"
            value={filters.course}
            onChange={(e) => handleFilterChange("course", e.target.value)}
          >
            <option value="">All Courses</option>
            {availableCourses.map((course) => (
              <option key={course.code} value={course.code}>
                {course.code} - {course.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="sortBy">Sort by:</label>
          <select id="sortBy" value={filters.sortBy} onChange={(e) => handleFilterChange("sortBy", e.target.value)}>
            <option value="score">Total Score</option>
            <option value="time">Time Taken</option>
          </select>
        </div>
        <div className={styles.searchGroup}>
          <input
            type="text"
            placeholder="Search participants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <i className="fas fa-search"></i>
        </div>
      </div>

      {/* Podium for top 3 */}
      {leaderboard.length >= 3 && filters.page === 1 && !filters.course && !searchTerm && (
        <div className={styles.podium}>
          <div className={`${styles.podiumPosition} ${styles.second}`}>
            <div className={styles.podiumUser}>
              <div className={styles.positionNumber}>2</div>
              <div className={styles.userAvatar}>{leaderboard[1]?.user?.fullName?.charAt(0) || "U"}</div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>{leaderboard[1]?.user?.fullName || "Unknown"}</div>
                <div className={styles.userScore}>{leaderboard[1]?.totalScore || 0}%</div>
                <div className={styles.userCourse}>{leaderboard[1]?.user?.course || ""}</div>
              </div>
            </div>
          </div>
          <div className={`${styles.podiumPosition} ${styles.first}`}>
            <div className={styles.podiumUser}>
              <div className={styles.positionNumber}>1</div>
              <div className={styles.userAvatar}>{leaderboard[0]?.user?.fullName?.charAt(0) || "U"}</div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>{leaderboard[0]?.user?.fullName || "Unknown"}</div>
                <div className={styles.userScore}>{leaderboard[0]?.totalScore || 0}%</div>
                <div className={styles.userCourse}>{leaderboard[0]?.user?.course || ""}</div>
              </div>
            </div>
          </div>
          <div className={`${styles.podiumPosition} ${styles.third}`}>
            <div className={styles.podiumUser}>
              <div className={styles.positionNumber}>3</div>
              <div className={styles.userAvatar}>{leaderboard[2]?.user?.fullName?.charAt(0) || "U"}</div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>{leaderboard[2]?.user?.fullName || "Unknown"}</div>
                <div className={styles.userScore}>{leaderboard[2]?.totalScore || 0}%</div>
                <div className={styles.userCourse}>{leaderboard[2]?.user?.course || ""}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className={styles.leaderboardTable}>
        <div className={styles.tableHeader}>
          <div className={`${styles.headerCell} ${styles.rank}`}>Rank</div>
          <div className={`${styles.headerCell} ${styles.participant}`}>Participant</div>
          <div className={`${styles.headerCell} ${styles.score}`}>Score</div>
          <div className={`${styles.headerCell} ${styles.correct}`}>Correct</div>
          <div className={`${styles.headerCell} ${styles.time}`}>Time</div>
          <div className={`${styles.headerCell} ${styles.courses}`}>Courses</div>
        </div>
        <div className={styles.tableBody}>
          {leaderboard.map((entry) => (
            <div 
              key={entry.userId} 
              className={`${styles.tableRow} ${entry.userId === user._id ? styles.currentUser : ""}`}
            >
              <div className={`${styles.tableCell} ${styles.rank}`}>
                <span className={styles.rankDisplay}>{getRankDisplay(entry.rank)}</span>
              </div>
              <div className={`${styles.tableCell} ${styles.participant}`}>
                <div className={styles.participantInfo}>
                  <div className={styles.participantAvatar}>
                    {entry.user?.fullName?.charAt(0) || "U"}
                  </div>
                  <div className={styles.participantDetails}>
                    <div className={styles.participantName}>
                      {entry.user?.fullName || "Unknown"}
                    </div>
                    <div className={styles.participantCourse}>
                      {entry.user?.course || ""}
                    </div>
                  </div>
                </div>
              </div>
              <div className={`${styles.tableCell} ${styles.score}`}>
                <div className={styles.scoreDisplay}>
                  <span className={styles.scoreValue}>{entry.totalScore}%</span>
                  {entry.isGraceSubmission && (
                    <span className={styles.graceIndicator}>Grace</span>
                  )}
                </div>
              </div>
              <div className={`${styles.tableCell} ${styles.correct}`}>
                <span>
                  {entry.correctAnswers}/{entry.totalQuestions}
                </span>
              </div>
              <div className={`${styles.tableCell} ${styles.time}`}>
                <span>{entry.timeUsed} min</span>
              </div>
              <div className={`${styles.tableCell} ${styles.courses}`}>
                <div className={styles.courseScores}>
                  {entry.courseScores?.map((course, index) => (
                    <div key={index} className={styles.courseScore}>
                      <span className={styles.courseCode}>{course.courseCode}</span>
                      <span className={styles.coursePercentage}>{course.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.paginationBtn}
            onClick={() => handleFilterChange("page", filters.page - 1)}
            disabled={!pagination.hasPrev}
          >
            <i className="fas fa-chevron-left"></i>
            Previous
          </button>
          <div className={styles.paginationInfo}>
            Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalResults} results)
          </div>
          <button
            className={styles.paginationBtn}
            onClick={() => handleFilterChange("page", filters.page + 1)}
            disabled={!pagination.hasNext}
          >
            Next
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      )}

      {leaderboard.length === 0 && !loading && (
        <div className={styles.emptyState}>
          <i className="fas fa-trophy"></i>
          <h3>No results found</h3>
          <p>No participants match your current filters</p>
        </div>
      )}
    </div>
  )
}

export default CompetitionLeaderboard