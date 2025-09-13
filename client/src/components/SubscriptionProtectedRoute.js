"use client"

import { useAuth } from "../contexts/AuthContext"
import SubscriptionRequired from "./SubscriptionRequired"

const SubscriptionProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    )
  }

  // Check if user is subscribed
  if (!user?.isSubscribed) {
    return <SubscriptionRequired />
  }

  return children
}

export default SubscriptionProtectedRoute
