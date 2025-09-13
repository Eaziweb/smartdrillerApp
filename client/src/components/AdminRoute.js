"use client"
import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading">
        <i className="fas fa-spinner fa-spin"></i>
        Loading...
      </div>
    )
  }

  if (!user || user.role !== "admin") {
    return <Navigate to="/admin/login" replace />
  }

  return children
}

export default AdminRoute
