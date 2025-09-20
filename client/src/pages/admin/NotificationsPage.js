"use client"
import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { Link } from "react-router-dom"
import styles from "../../styles/NotificationsPage.module.css"
import api from "../../utils/api";

const NotificationsPage = () => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [newNotification, setNewNotification] = useState({
    title: "",
    message: "",
    type: "info",
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const response = await api.get("/api/admin/notifications")
      setNotifications(response.data)
    } catch (error) {
      console.error("Failed to load notifications:", error)
      showMessage("Failed to load notifications", "error")
    }
    setLoading(false)
  }

  const handleCreateNotification = async (e) => {
    e.preventDefault()
    try {
      await api.post("/api/admin/notifications", newNotification)
      setNewNotification({ title: "", message: "", type: "info" })
      loadNotifications()
      showMessage("Notification created successfully!", "success")
    } catch (error) {
      showMessage("Failed to create notification", "error")
    }
  }

  const handleDeleteNotification = async (id) => {
    try {
      await api.delete(`/api/admin/notifications/${id}`)
      loadNotifications()
      showMessage("Notification deleted successfully!", "success")
    } catch (error) {
      showMessage("Failed to delete notification", "error")
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
        Loading notifications...
      </div>
    )
  }

  return (
    <div className={styles.notificationsPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <div>
              <h1>Notifications Management</h1>
              <p>Manage system notifications</p>
            </div>
            <Link to="/admin/dashboard" className={styles.backBtn}>
              <i className="fas fa-arrow-left"></i> Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Create Notification */}
        <div className={styles.section}>
          <h2>Create Notification</h2>
          <form onSubmit={handleCreateNotification} className={styles.form}>
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label htmlFor="title">Title</label>
                <input
                  type="text"
                  id="title"
                  value={newNotification.title}
                  onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                  required
                  placeholder="Notification title"
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="type">Type</label>
                <select
                  id="type"
                  value={newNotification.type}
                  onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value })}
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                value={newNotification.message}
                onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                required
                placeholder="Notification message"
                rows="3"
              />
            </div>
            <button type="submit" className={styles.submitBtn}>
              <span>Create Notification</span>
              <i className="fas fa-plus"></i>
            </button>
          </form>
        </div>

        {/* Notifications List */}
        <div className={styles.section}>
          <h2>Manage Notifications</h2>
          {notifications.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>
              No notifications created yet
            </p>
          ) : (
            <div className={styles.notificationsList}>
              {notifications.map((notification) => (
                <div key={notification._id} className={styles.notificationItem}>
                  <div className={styles.notificationContent}>
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <div className={styles.notificationMeta}>
                      <span>{new Date(notification.createdAt).toLocaleDateString()}</span>
                      <span className={`${styles.notificationType} ${styles[`type${notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}`]}`}>
                        {notification.type.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteNotification(notification._id)} className={styles.deleteBtn}>
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationsPage