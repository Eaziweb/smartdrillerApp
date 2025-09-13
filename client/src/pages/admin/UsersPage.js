"use client"
import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { Link } from "react-router-dom"
import axios from "axios"
import styles from "../../styles/UsersPage.module.css"

const UsersPage = () => {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await axios.get("/api/admin/users")
      setUsers(response.data)
    } catch (error) {
      console.error("Failed to load users:", error)
      showMessage("Failed to load users", "error")
    }
    setLoading(false)
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

        {/* Users Table */}
        <div className={styles.section}>
          <h2>Registered Users</h2>
          {users.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>
              No users found
            </p>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.usersTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Course</th>
                    <th>Phone</th>
                    <th>Account No.</th>
                    <th>Bank Name</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>{user.fullName}</td>
                      <td>{user.email}</td>
                      <td>{user.course}</td>
                      <td>{user.phoneNumber || "N/A"}</td>
                      <td>{user.accountNumber || "N/A"}</td>
                      <td>{user.bankName || "N/A"}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${user.isSubscribed ? styles.subscribed : styles.expired}`}>
                          {user.isSubscribed ? "Subscribed" : "Not Subscribed"}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
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