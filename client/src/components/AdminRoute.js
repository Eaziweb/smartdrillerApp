"use client"
import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import styles from "../styles/loading.module.css"


const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinnerContainer}>
          <i className="fas fa-spinner fa-spin"></i>
        </div>
      </div>
    )
  }

  if (!user || user.role !== "admin") {
    return <Navigate to="/private/admin/login" replace />
  }

  return children
}

export default AdminRoute