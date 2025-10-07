"use client"
import { useAuth } from "../contexts/AuthContext"
import { Navigate } from "react-router-dom"
import { useEffect, useState } from "react"

const SuperAdminRoute = ({ children }) => {
  const { user, loading, isInitialized } = useAuth()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Simulate a small delay to check auth status
    const timer = setTimeout(() => {
      setIsChecking(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  if (loading || isChecking || !isInitialized) {
    return (
      <div className="loading">
        <i className="fas fa-spinner fa-spin"></i>
        Verifying access...
      </div>
    )
  }

  if (!user || user.role !== "superadmin") {
    return <Navigate to="/private/superadmin/login" replace />
  }

  return children
}

export default SuperAdminRoute