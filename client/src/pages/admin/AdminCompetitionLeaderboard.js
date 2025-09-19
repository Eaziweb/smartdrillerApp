"use client"
import { useState, useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import axios from "axios"
import styles from "../../styles/AdminCompetitionLeaderboard.module.css"

const AdminCompetitionLeaderboard = () => {
  const { id } = useParams()
  const [competition, setCompetition] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [filters, setFilters] = useState({
    course: "",
    sortBy: "score",
    page: 1,
    limit: 100,
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
      const response = await axios.get(`/api/admin/competitions/${id}`)
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
      if (searchTerm) params.append("search", searchTerm)
      const response = await axios.get(`/api/competitions/${id}/leaderboard?${params}`)
      setLeaderboard(response.data.leaderboard)
      setStats(response.data.stats)
      setPagination(response.data.pagination)
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
      showMessage("Failed to fetch leaderboard", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key !== "page" ? 1 : value,
    }))
  }

  const handleRefresh = () => {
    setLoading(true)
    fetchLeaderboard()
  }

const handleExport = async () => {
  setExporting(true)
  try {
    // Fetch all results for export
    const params = new URLSearchParams({
      sortBy: filters.sortBy,
      page: "1",
      limit: "10000", // Get all results
    })
    if (filters.course) params.append("course", filters.course)
    if (searchTerm) params.append("search", searchTerm)
    const response = await axios.get(`/api/competitions/${id}/leaderboard?${params}`)
    const allResults = response.data.leaderboard
    // Create CSV content
    const csvHeaders = [
      "Rank",
      "Name",
      "Email",
      "Course",
      "Phone",
      "Account Number",
      "Total Score (%)",
      "Correct Answers",
      "Total Questions",
      "Time Used (min)",
      "Submission Time",
      "Grace Submission",
      ...availableCourses.map((course) => `${course.code} Score (%)`),
    ]
    const csvRows = allResults.map((entry) => {
      const courseScores = availableCourses.map((course) => {
        const courseScore = entry.courseScores?.find((cs) => cs.courseCode === course.code)
        return courseScore ? courseScore.score : "N/A"
      })
      return [
        entry.rank,
        entry.user?.fullName || "Unknown",
        entry.user?.email || "",
        getCourseName(entry.user), // Use the getCourseName function
        entry.user?.phoneNumber || "",
        entry.user?.accountNumber || "",
        entry.totalScore,
        entry.correctAnswers,
        entry.totalQuestions,
        entry.timeUsed,
        new Date(entry.submittedAt).toLocaleString(),
        entry.isGraceSubmission ? "Yes" : "No",
        ...courseScores,
      ]
    })
    const csvContent = [csvHeaders, ...csvRows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${competition.name}_leaderboard_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showMessage("Leaderboard exported successfully", "success")
  } catch (error) {
    console.error("Error exporting leaderboard:", error)
    showMessage("Failed to export leaderboard", "error")
  } finally {
    setExporting(false)
  }
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

// components/AdminCompetitionLeaderboard.js

const getCourseName = (user) => {
  if (!user) return "N/A"
  
  // Use the populated courseName field from the backend
  if (user.courseName) {
    return user.courseName
  }
  
  // If course is an object with a name property (fallback)
  if (typeof user.course === 'object' && user.course !== null && user.course.name) {
    return user.course.name
  }
  
  // If course is a string (for admin/superadmin)
  if (typeof user.course === 'string') {
    return user.course
  }
  
  // If course is an ObjectId (regular user)
  if (user.course && typeof user.course === 'object' && user.course._id) {
    return "Course data unavailable"
  }
  
  return "N/A"
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
        <Link to="/admin/competitions" className={`${styles.btn} ${styles.btnPrimary}`}>
          Back to Competitions
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.adminPage}>
      <div className={styles.adminHeader}>
        <Link to="/admin/competitions" className={styles.backBtn}>
          <i className="fas fa-arrow-left"></i>
        </Link>
        <div className={styles.headerContent}>
          <h1>{competition.name} - Admin Leaderboard</h1>
          <div className={styles.competitionInfo}>
            <span className={`${styles.statusBadge} ${styles[`status${competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}`]}`}>
              {competition.status.toUpperCase()}
            </span>
            <span className={styles.competitionDate}>Ended: {formatDate(competition.endDate)}</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={`${styles.btn} ${styles.btnSecondary}`} 
            onClick={handleRefresh} 
            disabled={loading}
          >
            <i className={`fas fa-sync-alt ${loading ? "fa-spin" : ""}`}></i>
            Refresh
          </button>
          <button 
            className={`${styles.btn} ${styles.btnPrimary}`} 
            onClick={handleExport} 
            disabled={exporting || leaderboard.length === 0}
          >
            <i className={`fas fa-download ${exporting ? "fa-spin" : ""}`}></i>
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      <div className={styles.adminContent}>
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
                <i className="fas fa-clock"></i>
              </div>
              <div className={styles.statContent}>
                <h3>
                  {Math.round(leaderboard.reduce((sum, entry) => sum + entry.timeUsed, 0) / leaderboard.length) || 0}
                </h3>
                <p>Avg Time (min)</p>
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
          <div className={styles.filterGroup}>
            <label htmlFor="limitFilter">Results per page:</label>
            <select
              id="limitFilter"
              value={filters.limit}
              onChange={(e) => handleFilterChange("limit", Number.parseInt(e.target.value))}
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
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

        {/* Admin Leaderboard Table */}
        <div className={styles.adminLeaderboardTable}>
          <div className={styles.tableHeader}>
            <div className={`${styles.headerCell} ${styles.rank}`}>Rank</div>
            <div className={`${styles.headerCell} ${styles.participant}`}>Participant</div>
            <div className={`${styles.headerCell} ${styles.contact}`}>Contact</div>
            <div className={`${styles.headerCell} ${styles.banking}`}>Banking</div>
            <div className={`${styles.headerCell} ${styles.score}`}>Score</div>
            <div className={`${styles.headerCell} ${styles.time}`}>Time</div>
            <div className={`${styles.headerCell} ${styles.courses}`}>Course Scores</div>
            <div className={`${styles.headerCell} ${styles.submission}`}>Submission</div>
          </div>
          <div className={styles.tableBody}>
            {leaderboard.map((entry) => (
              <div key={entry.userId} className={styles.tableRow}>
                <div className={`${styles.tableCell} ${styles.rank}`}>
                  <span className={styles.rankDisplay}>{getRankDisplay(entry.rank)}</span>
                </div>
                <div className={`${styles.tableCell} ${styles.participant}`}>
                  <div className={styles.participantInfo}>
                    <div className={styles.participantAvatar}>{entry.user?.fullName?.charAt(0) || "U"}</div>
                    <div className={styles.participantDetails}>
                      <div className={styles.participantName}>{entry.user?.fullName || "Unknown"}</div>
                      <div className={styles.participantCourse}>{getCourseName(entry.user)}</div>
                    </div>
                  </div>
                </div>
                <div className={`${styles.tableCell} ${styles.contact}`}>
                  <div className={styles.contactInfo}>
                    <div className={styles.contactEmail}>{entry.user?.email || "N/A"}</div>
                    <div className={styles.contactPhone}>{entry.user?.phoneNumber || "N/A"}</div>
                  </div>
                </div>
                <div className={`${styles.tableCell} ${styles.banking}`}>
                  <div className={styles.bankingInfo}>
                    <div className={styles.accountNumber}>{entry.user?.accountNumber || "N/A"}</div>
                    <div className={styles.bankName}>{entry.user?.bankName || "N/A"}</div>
                  </div>
                </div>
                <div className={`${styles.tableCell} ${styles.score}`}>
                  <div className={styles.scoreDisplay}>
                    <span className={styles.scoreValue}>{entry.totalScore}%</span>
                    <span className={styles.scoreFraction}>
                      {entry.correctAnswers}/{entry.totalQuestions}
                    </span>
                    {entry.isGraceSubmission && <span className={styles.graceIndicator}>Grace</span>}
                  </div>
                </div>
                <div className={`${styles.tableCell} ${styles.time}`}>
                  <span className={styles.timeCell}>{entry.timeUsed} min</span>
                </div>
                <div className={`${styles.tableCell} ${styles.courses}`}>
                  <div className={styles.courseScores}>
                    {entry.courseScores?.map((course, index) => (
                      <div key={index} className={styles.courseScore}>
                        <span className={styles.courseCode}>{course.courseCode}</span>
                        <span className={styles.coursePercentage}>{course.score}%</span>
                        <span className={styles.courseFraction}>
                          {course.correctAnswers}/{course.totalQuestions}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`${styles.tableCell} ${styles.submission}`}>
                  <div className={styles.submissionInfo}>
                    <div className={styles.submissionTime}>{formatDate(entry.submittedAt)}</div>
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
    </div>
  )
}

export default AdminCompetitionLeaderboard