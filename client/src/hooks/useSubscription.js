"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"

export const useSubscription = () => {
  const { user, isSubscriptionActive, getSubscriptionDaysRemaining, checkSubscriptionStatus } = useAuth()
  const [subscriptionData, setSubscriptionData] = useState({
    isActive: false,
    daysRemaining: 0,
    status: "inactive",
    expiryDate: null,
  })

  useEffect(() => {
    if (user) {
      const isActive = isSubscriptionActive()
      const daysRemaining = getSubscriptionDaysRemaining()

      setSubscriptionData({
        isActive,
        daysRemaining,
        status: user.subscriptionStatus || "inactive",
        expiryDate: user.subscriptionEndDate,
      })
    }
  }, [user, isSubscriptionActive, getSubscriptionDaysRemaining])

  const refreshSubscription = async () => {
    await checkSubscriptionStatus()
  }

  const isExpiringSoon = () => {
    return subscriptionData.isActive && subscriptionData.daysRemaining <= 7
  }

  const getStatusMessage = () => {
    if (!subscriptionData.isActive) {
      return user?.subscriptionStatus === "expired" ? "Your subscription has expired" : "No active subscription"
    }

    if (subscriptionData.daysRemaining === 0) {
      return "Subscription expires today"
    }
"use client"

import { useAuth } from "../contexts/AuthContext"

export const useSubscription = () => {
  const { user } = useAuth()

  const isSubscribed = user?.isSubscribed || false
  const subscriptionStatus = user?.subscriptionStatus || "inactive"
  const subscriptionExpiry = user?.subscriptionExpiry || null

  const checkFeatureAccess = (feature) => {
    // Define which features require subscription
    const premiumFeatures = ["study", "mock", "bookmarks", "results", "course-selection"]

    if (premiumFeatures.includes(feature)) {
      return isSubscribed
    }

    return true // Free features
  }

  return {
    isSubscribed,
    subscriptionStatus,
    subscriptionExpiry,
    checkFeatureAccess,
  }
}

    if (subscriptionData.daysRemaining === 1) {
      return "Subscription expires tomorrow"
    }

    return `Subscription expires in ${subscriptionData.daysRemaining} days`
  }

  return {
    ...subscriptionData,
    refreshSubscription,
    isExpiringSoon,
    getStatusMessage,
  }
}
