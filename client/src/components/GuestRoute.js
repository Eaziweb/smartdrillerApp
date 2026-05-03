"use client"
import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import styles from "../styles/loading.module.css"

const GuestRoute = ({ children }) => {
  const { user, loading, isInitialized } = useAuth()

  // Wait until the AuthContext has finished checking localStorage
  if (!isInitialized || loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinnerContainer}>
          <i className="fas fa-spinner fa-spin"></i>
        </div>
      </div>
    )
  }

  // If the user is already logged in, redirect them immediately to home
  if (user) {
    if (user.role === "admin") return <Navigate to="/admin/dashboard" replace />
    if (user.role === "superadmin") return <Navigate to="/superadmin/dashboard" replace />
    
    return <Navigate to="/home" replace />
  }

  // If not logged in, allow them to view the page (Landing, Login, etc.)
  return children
}

export default GuestRoute