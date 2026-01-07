"use client"
import { useState, useEffect, useMemo } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { Link } from "react-router-dom"
import styles from "../../styles/UsersPage.module.css"
import api from "../../utils/api"

const UsersPage = () => {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [universityFilter, setUniversityFilter] = useState("")
  const [courseFilter, setCourseFilter] = useState("")
  const [subscriptionFilter, setSubscriptionFilter] = useState("")
  const [stats, setStats] = useState({
    totalUsers: 0,
    subscribedUsers: 0,
    subscriptionPercentage: 0,
    verifiedUsers: 0
  })

  // Get unique universities and courses for filter dropdowns
  const universities = useMemo(() => {
    const uniqueUniversities = [...new Set(users.map(user => {
      if (user.university && typeof user.university === 'object') {
        return user.university.name
      }
      return user.university || "N/A"
    }))]
    return uniqueUniversities.filter(name => name !== "N/A")
  }, [users])

  const courses = useMemo(() => {
    const uniqueCourses = [...new Set(users.map(user => {
      if (user.course && typeof user.course === 'object') {
        return user.course.name
      }
      return user.course || "N/A"
    }))]
    return uniqueCourses.filter(name => name !== "N/A")
  }, [users])

  useEffect(() => {
    loadUsers()
    loadStats()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await api.get("/api/admin/users")
      setUsers(response.data)
    } catch (error) {
      console.error("Failed to load users:", error)
      showMessage("Failed to load users", "error")
    }
    setLoading(false)
  }

  const loadStats = async () => {
    try {
      const response = await api.get("/api/admin/dashboard")
      setStats(response.data)
    } catch (error) {
      console.error("Failed to load stats:", error)
    }
  }

  const toggleSubscription = async (userId, currentStatus) => {
    try {
      const response = await api.put(`/api/admin/users/${userId}/subscription`, {
        isSubscribed: !currentStatus
      })
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === userId 
            ? { ...user, isSubscribed: !currentStatus } 
            : user
        )
      )
      
      // Update stats
      loadStats()
      
      showMessage(`User ${!currentStatus ? 'subscribed' : 'unsubscribed'} successfully`, "success")
    } catch (error) {
      console.error("Failed to toggle subscription:", error)
      showMessage("Failed to update subscription", "error")
    }
  }

  // --- NEW FEATURE: Download Emails ---
  const downloadEmails = () => {
    if (filteredUsers.length === 0) {
      showMessage("No users to download", "error")
      return
    }

    // Create CSV content
    const csvRows = []
    // Header row
    csvRows.push(["Name", "Email"])

    // Data rows
    filteredUsers.forEach(user => {
      // Escape quotes in names to prevent CSV breaking
      const safeName = user.fullName.replace(/"/g, '""') 
      csvRows.push([safeName, user.email])
    })

    // Convert array of arrays to CSV string
    const csvString = csvRows.map(row => row.join(",")).join("\n")

    // Create a blob and download link
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "user_emails.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showMessage("Email list downloaded successfully", "success")
  }

  // Filter users based on search term and filters
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = searchTerm === "" || 
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesUniversity = universityFilter === "" || 
        (user.university && typeof user.university === 'object' 
          ? user.university.name === universityFilter 
          : user.university === universityFilter)
      
      const matchesCourse = courseFilter === "" || 
        (user.course && typeof user.course === 'object' 
          ? user.course.name === courseFilter 
          : user.course === courseFilter)
      
      const matchesSubscription = subscriptionFilter === "" || 
        user.isSubscribed.toString() === subscriptionFilter
      
      return matchesSearch && matchesUniversity && matchesCourse && matchesSubscription
    })
  }, [users, searchTerm, universityFilter, courseFilter, subscriptionFilter])

  // Function to get course name
  const getCourseName = (user) => {
    if (user.course) {
      if (typeof user.course === 'object' && user.course.name) {
        return user.course.name
      } else if (typeof user.course === 'string') {
        return user.course
      }
    }
    return "N/A"
  }

  // Function to get university name
  const getUniversityName = (user) => {
    if (user.university) {
      if (typeof user.university === 'object' && user.university.name) {
        return user.university.name
      } else if (typeof user.university === 'string') {
        return user.university
      }
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

  if (loading) {
    return (
      <div className={styles.loading}>
        <i className="fas fa-spinner fa-spin"></i>
        Loading users...
      </div>
    )
  }

  return (
    <div className={styles.usersPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <div>
              <h1>User Management</h1>
              <p>Manage all registered users</p>
            </div>
            <Link to="/admin/dashboard" className={styles.backBtn}>
              <i className="fas fa-arrow-left"></i> Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Stats Section */}
        <div className={styles.statsSection}>
          <h2>Statistics</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <i className="fas fa-users"></i>
              </div>
              <div className={styles.statContent}>
                <h3>{stats.totalUsers}</h3>
                <p>Total Users</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <i className="fas fa-check-circle"></i>
              </div>
              <div className={styles.statContent}>
                <h3>{stats.subscribedUsers}</h3>
                <p>Subscribed</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <i className="fas fa-percentage"></i>
              </div>
              <div className={styles.statContent}>
                <h3>{stats.subscriptionPercentage}%</h3>
                <p>Subscription Rate</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <i className="fas fa-user-check"></i>
              </div>
              <div className={styles.statContent}>
                <h3>{stats.verifiedUsers || stats.totalUsers}</h3>
                <p>Verified Users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className={styles.searchSection}>
          <h2>Search & Filter</h2>
          <div className={styles.searchControls}>
            <div className={styles.searchInputContainer}>
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            
            <div className={styles.filterControls}>
              <div className={styles.filterGroup}>
                <label>University</label>
                <select
                  value={universityFilter}
                  onChange={(e) => setUniversityFilter(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="">All Universities</option>
                  {universities.map((university, index) => (
                    <option key={index} value={university}>
                      {university}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className={styles.filterGroup}>
                <label>Course</label>
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="">All Courses</option>
                  {courses.map((course, index) => (
                    <option key={index} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className={styles.filterGroup}>
                <label>Subscription</label>
                <select
                  value={subscriptionFilter}
                  onChange={(e) => setSubscriptionFilter(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="">All</option>
                  <option value="true">Subscribed</option>
                  <option value="false">Not Subscribed</option>
                </select>
              </div>
              
              <button 
                className={styles.clearFiltersBtn}
                onClick={() => {
                  setSearchTerm("")
                  setUniversityFilter("")
                  setCourseFilter("")
                  setSubscriptionFilter("")
                }}
              >
                <i className="fas fa-times"></i> Clear
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2>Registered Users</h2>
              <p>{filteredUsers.length} of {users.length} users</p>
            </div>
            {/* Download Button Added Here */}
            <button 
              onClick={downloadEmails}
              className={`${styles.primaryBtn} ${styles.downloadBtn}`} 
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem'
              }}
            >
              <i className="fas fa-download"></i> Download Emails
            </button>
          </div>
          
          {filteredUsers.length === 0 ? (
            <div className={styles.noResults}>
              <i className="fas fa-search"></i>
              <h3>No users found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.usersTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>University</th>
                    <th>Course</th>
                    <th>Phone</th>
                    <th>Account No.</th>
                    <th>Bank Name</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user._id}>
                      <td>{user.fullName}</td>
                      <td>{user.email}</td>
                      <td>{getUniversityName(user)}</td>
                      <td>{getCourseName(user)}</td>
                      <td>{user.phoneNumber || "N/A"}</td>
                      <td>{user.accountNumber || "N/A"}</td>
                      <td>{user.bankName || "N/A"}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${user.isSubscribed ? styles.subscribed : styles.expired}`}>
                          {user.isSubscribed ? "Subscribed" : "Not Subscribed"}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          className={`${styles.toggleBtn} ${user.isSubscribed ? styles.unsubscribe : styles.subscribe}`}
                          onClick={() => toggleSubscription(user._id, user.isSubscribed)}
                        >
                          {user.isSubscribed ? "Unsubscribe" : "Subscribe"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UsersPage