"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import "../styles/subscription.css"

const SubscriptionStatus = ({ showDetails = true }) => {
  const { user, isSubscriptionActive, getSubscriptionDaysRemaining } = useAuth()
  const [daysRemaining, setDaysRemaining] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      setDaysRemaining(getSubscriptionDaysRemaining())
    }
  }, [user, getSubscriptionDaysRemaining])

  if (!user) return null

  const isActive = isSubscriptionActive()
  const statusClass = isActive ? "subscription-active" : "subscription-inactive"

  const handleActivate = () => {
    navigate("/payment")
  }

  return (
    <div className={`subscription-status ${statusClass}`}>
      <div className="subscription-indicator">
        <div className={`status-dot ${isActive ? "active" : "inactive"}`}></div>
        <span className="status-text">
          {isActive ? "Active" : user.subscriptionStatus === "expired" ? "Expired" : "Inactive"}
        </span>
      </div>

      {showDetails && (
        <div className="subscription-details">
          {isActive ? (
            <div className="active-details">
              <p>
                {daysRemaining > 0
                  ? `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`
                  : "Expires today"}
              </p>
              {daysRemaining <= 7 && (
                <button onClick={handleActivate} className="renew-btn">
                  Renew Now
                </button>
              )}
            </div>
          ) : (
            <div className="inactive-details">
              <p>Subscribe to access all features</p>
              <button onClick={handleActivate} className="activate-btn">
                Activate
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SubscriptionStatus
