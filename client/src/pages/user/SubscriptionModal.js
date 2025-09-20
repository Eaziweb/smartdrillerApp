"use client"
import { useState, useEffect } from "react"
import api from "../../utils/api";
import styles from "../../styles/subscriptionModal.module.css"

const SubscriptionModal = ({ isOpen, onClose, user }) => {
  const [subscriptionOptions, setSubscriptionOptions] = useState({
    monthly: null,
    semester: null,
  })
  const [selectedPlan, setSelectedPlan] = useState("monthly")
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringMonths, setRecurringMonths] = useState(3)
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
        isRecurring: selectedPlan === "monthly" ? isRecurring : false,
        recurringMonths: selectedPlan === "monthly" && isRecurring ? recurringMonths : 1,
      }
      
      
      const response = await api.post("/api/payments/initialize", subscriptionData)
      
      
      if (response.data.status === "success") {
        // Redirect to Flutterwave payment link
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
        
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}
        
        <div className={styles.plansContainer}>
          {/* Monthly Plan */}
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
          
          {/* Semester Plan - Only show if available */}
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
        
        {/* Recurring Options - Only for Monthly */}
        {selectedPlan === "monthly" && (
          <div className={styles.recurringOptions}>
            <div className={styles.recurringToggle}>
              <label className={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                />
                <span className={styles.slider}></span>
              </label>
              <span>Set up recurring payment</span>
            </div>
            
            {isRecurring && (
              <div className={styles.recurringMonths}>
                <label>Number of months:</label>
                <select 
                  value={recurringMonths}
                  onChange={(e) => setRecurringMonths(parseInt(e.target.value))}
                >
                        <option value={1}>1 months</option>
                  <option value={2}>2 months</option>
                  <option value={3}>3 months</option>
                  <option value={4}>4 months</option>
                </select>
                <div className={styles.recurringInfo}>
                  <p>You'll be charged ₦{subscriptionOptions.monthly?.price || 2000} monthly for {recurringMonths} months</p>
                  <p>First payment now, then automatic renewal each month</p>
                  <div className={styles.totalPrice}>
                    Total: ₦{(subscriptionOptions.monthly?.price || 2000) * recurringMonths}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        <button 
          className={styles.subscribeButton}
          onClick={handleSubscribe}
          disabled={loading}
        >
          {loading ? "Processing..." : `Subscribe to ${selectedPlan} Plan`}
        </button>
      </div>
    </div>
  )
}

export default SubscriptionModal