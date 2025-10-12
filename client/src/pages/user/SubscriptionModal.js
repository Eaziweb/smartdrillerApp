"use client"

import { useState, useEffect } from "react"
import api from "../../utils/api"
import styles from "../../styles/subscriptionModal.module.css"

const SubscriptionModal = ({ isOpen, onClose, user }) => {
  const [subscriptionOptions, setSubscriptionOptions] = useState({
    monthly: null,
    semester: null,
  })
  const [selectedPlan, setSelectedPlan] = useState("monthly")
  const [selectedMonths, setSelectedMonths] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (isOpen && user) {
      fetchSubscriptionOptions()
    }
  }, [isOpen, user])

  const fetchSubscriptionOptions = async () => {
    try {
      const response = await api.get("/api/payments/subscription-options")
      setSubscriptionOptions(response.data.options)
    } catch (error) {
      console.error("Failed to fetch subscription options:", error)
      setError("Failed to load subscription options. Please try again later.")
    }
  }

  const handleSubscribe = async () => {
    if (!user) {
      setError("User not found. Please log in again.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const subscriptionData = {
        subscriptionType: selectedPlan,
        months: selectedPlan === "monthly" ? selectedMonths : 1,
      }

      const response = await api.post("/api/payments/initialize", subscriptionData)

      if (response.data.status === "success") {
        window.location.href = response.data.data.link
      } else {
        setError("Failed to initialize payment. Please try again.")
      }
    } catch (error) {
      console.error("Payment initialization error:", error)
      const errorMessage = error.response?.data?.message || "Failed to initialize payment. Please try again."
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>

        <div className={styles.modalHeader}>
          <h2>Choose Your Subscription Plan</h2>
          <p>Select the plan that works best for you</p>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.plansContainer}>
          <div
            className={`${styles.planCard} ${selectedPlan === "monthly" ? styles.selected : ""}`}
            onClick={() => setSelectedPlan("monthly")}
          >
            <div className={styles.planHeader}>
              <h3>Monthly Plan</h3>
              <div className={styles.planPrice}>
                ₦{subscriptionOptions.monthly?.price || 2000}
                <span>/month</span>
              </div>
            </div>
            <div className={styles.planFeatures}>
              <p>30 days access to all features</p>
              <p>Cancel anytime</p>
            </div>
          </div>

          {subscriptionOptions.semester && (
            <div
              className={`${styles.planCard} ${selectedPlan === "semester" ? styles.selected : ""}`}
              onClick={() => setSelectedPlan("semester")}
            >
              <div className={styles.planHeader}>
                <h3>Semester Plan</h3>
                <div className={styles.planPrice}>
                  ₦{subscriptionOptions.semester?.price || 6000}
                  <span>/semester</span>
                </div>
              </div>
              <div className={styles.planFeatures}>
                <p>Access until {new Date(subscriptionOptions.semester.endDate).toLocaleDateString()}</p>
                <p>Best value for students</p>
              </div>
            </div>
          )}
        </div>

        {selectedPlan === "monthly" && (
          <div className={styles.monthsSelection}>
            <h3>Select Number of Months</h3>
            <div className={styles.monthsOptions}>
              {[1, 2, 3, 4, 5, 6].map((months) => (
                <button
                  key={months}
                  className={`${styles.monthButton} ${selectedMonths === months ? styles.selected : ""}`}
                  onClick={() => setSelectedMonths(months)}
                >
                  {months} month{months > 1 ? "s" : ""}
                </button>
              ))}
            </div>
            <div className={styles.totalPrice}>
              <p>
                Total:{" "}
                <span className={styles.priceAmount}>
                  ₦{(subscriptionOptions.monthly?.price || 2000) * selectedMonths}
                </span>
              </p>
              <p className={styles.priceDescription}>
                You'll have access for {selectedMonths} month{selectedMonths > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}

        <button className={styles.subscribeButton} onClick={handleSubscribe} disabled={loading}>
          {loading ? "Processing..." : `Subscribe to ${selectedPlan} Plan`}
        </button>
      </div>
    </div>
  )
}

export default SubscriptionModal
