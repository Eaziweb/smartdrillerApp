"use client"
import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { Link } from "react-router-dom"
import axios from "axios"
import styles from "../../styles/AdminDashboard.module.css"

const AdminDashboard = () => {
  const { user, logout } = useAuth()
  const [stats, setStats] = useState({
    totalUsers: 0,
    subscribedUsers: 0,
    subscriptionPercentage: 0,
    totalRevenue: 0,
  })
  const [settings, setSettings] = useState({
    subscriptionEndDate: "",
    subscriptionPrice: 3000,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsRes, settingsRes] = await Promise.all([
        axios.get("/api/admin/dashboard"),
        axios.get("/api/admin/subscription-settings"),
      ])
      setStats(statsRes.data)
      setSettings({
        subscriptionEndDate: settingsRes.data.subscriptionEndDate?.split("T")[0] || "",
        subscriptionPrice: settingsRes.data.subscriptionPrice || 3000,
      })
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    }
    setLoading(false)
  }

  const handleUpdateSettings = async (e) => {
    e.preventDefault()
    try {
      await axios.put("/api/admin/subscription-settings", {
        subscriptionEndDate: settings.subscriptionEndDate,
      })
      showMessage("Subscription settings updated successfully!", "success")
    } catch (error) {
      showMessage("Failed to update settings", "error")
    }
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
        Loading dashboard...
      </div>
    )
  }

  return (
    <div className={styles.adminPage}>
      <div className={styles.adminContainer}>
        <div className={styles.adminHeader}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <div>
              <h1>Admin Dashboard</h1>
              <p>Welcome back, {user?.fullName}</p>
            </div>
            <button onClick={logout} className={styles.logoutBtn}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-users"></i>
            </div>
            <div className={styles.statValue}>{stats.totalUsers}</div>
            <div className={styles.statLabel}>Total Users</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-user-check"></i>
            </div>
            <div className={styles.statValue}>{stats.subscribedUsers}</div>
            <div className={styles.statLabel}>Subscribed Users</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-percentage"></i>
            </div>
            <div className={styles.statValue}>{stats.subscriptionPercentage}%</div>
            <div className={styles.statLabel}>Subscription Rate</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-naira-sign"></i>
            </div>
            <div className={styles.statValue}>₦{stats.totalRevenue.toLocaleString()}</div>
            <div className={styles.statLabel}>Total Revenue</div>
          </div>
        </div>
        
        {/* Admin Navigation Buttons */}
        <div className={styles.adminBtns}>
          <Link to="/admin/quiz" className={styles.adminBtn}>
            Quiz Management
          </Link>
             <Link to="/admin/reports" className={styles.adminBtn}>
            Report Management
          </Link>
           <Link to="/admin/competitions" className={styles.adminBtn}>
            Competition Management
          </Link>
          <Link to="/admin/notes" className={styles.adminBtn}>
            Notes Management
          </Link>
          <Link to="/admin/videos" className={styles.adminBtn}>
            Video Management
          </Link>
          <Link to="/admin/materials" className={styles.adminBtn}>
            Material Management
          </Link>
          <Link to="/admin/notifications" className={styles.adminBtn}>
            Notification Management
          </Link>
          <Link to="/admin/users" className={styles.adminBtn}>
            User Management
          </Link>
        </div>
        
        {/* Subscription Settings */}
        <div className={styles.adminSection}>
          <h2>Subscription Settings</h2>
          <form onSubmit={handleUpdateSettings} className={styles.adminForm}>
            <div className={styles.inputGroup}>
              <label htmlFor="subscriptionEndDate">Global Subscription End Date</label>
              <input
                type="date"
                id="subscriptionEndDate"
                value={settings.subscriptionEndDate}
                onChange={(e) => setSettings({ ...settings, subscriptionEndDate: e.target.value })}
                required
              />
              <small style={{ color: "var(--text-secondary)", marginTop: "0.5rem", display: "block" }}>
                All user subscriptions will expire on this date
              </small>
            </div>
            <button type="submit" className={styles.submitBtn}>
              <span>Update Settings</span>
              <i className="fas fa-save"></i>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard