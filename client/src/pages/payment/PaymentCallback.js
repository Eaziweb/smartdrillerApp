"use client"
import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/payment.module.css"
import api from "../../utils/api"

const PaymentCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const [status, setStatus] = useState("verifying")
  const [message, setMessage] = useState("Verifying your payment...")
  const [retryCount, setRetryCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState(null)
  const maxRetries = 3

  useEffect(() => {
    const transactionId = searchParams.get("transaction_id")
    const txRef = searchParams.get("tx_ref")
    const statusParam = searchParams.get("status")

    if (!txRef && !transactionId) {
      setStatus("error")
      setMessage("Invalid payment parameters. No transaction reference found.")
      setIsAnimating(true)
      return
    }

    if (statusParam === "cancelled") {
      setStatus("cancelled")
      setMessage("Payment was cancelled. You can try again when you're ready.")
      setIsAnimating(true)
      setTimeout(() => navigate("/home"), 3000)
      return
    }

    // Start payment verification
    verifyPayment(txRef || transactionId)
  }, [])

  const verifyPayment = async (paymentRef) => {
    try {
      console.log("Verifying payment with reference:", paymentRef)
      
      const response = await api.post(`/api/payments/verify/${paymentRef}`)
      console.log("Payment verification response:", response.data)

      if (response.data.status === "success") {
        setStatus("success")
        setMessage("Payment successful! Your subscription has been activated.")
        setIsAnimating(true)
        setPaymentDetails(response.data.user)
        
        // Update user context with the latest user data
        if (response.data.user && updateUser) {
          console.log("Updating user context with:", response.data.user)
          updateUser(response.data.user)
        }
        
        // Redirect to home after a short delay
        setTimeout(() => navigate("/home"), 3000)
      } else {
        setStatus("error")
        setMessage(response.data.message || "Payment verification failed. Please contact support.")
        setIsAnimating(true)
      }
    } catch (error) {
      console.error("Payment verification error:", error)
      
      // Check if we should retry
      if (shouldRetry(error)) {
        if (retryCount < maxRetries) {
          setRetryCount(prevCount => prevCount + 1)
          setMessage(`Payment verification failed. Retrying... (Attempt ${retryCount + 1} of ${maxRetries})`)
          
          // Exponential backoff for retries
          const delay = Math.pow(2, retryCount) * 1000
          setTimeout(() => verifyPayment(paymentRef), delay)
          return
        }
      }
      
      // If we can't retry or have exhausted retries
      setStatus("error")
      setMessage(
        error.response?.data?.message || 
        "An error occurred while verifying payment. Please contact support with your transaction reference."
      )
      setIsAnimating(true)
    }
  }

  // Determine if we should retry based on the error
  const shouldRetry = (error) => {
    // Don't retry on client errors (4xx) except for 408 (timeout) and 429 (too many requests)
    if (error.response) {
      const status = error.response.status
      return status === 408 || status === 429 || status >= 500
    }
    
    // Retry on network errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return true
    }
    
    return false
  }

  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return "fa-check-circle"
      case "error":
        return "fa-exclamation-triangle"
      case "cancelled":
        return "fa-times-circle"
      default:
        return "fa-spinner"
    }
  }

  const handleRetry = () => {
    const txRef = searchParams.get("tx_ref") || searchParams.get("transaction_id")
    setStatus("verifying")
    setMessage("Retrying payment verification...")
    setRetryCount(0)
    setIsAnimating(false)
    verifyPayment(txRef)
  }

  const handleContactSupport = () => {
    const txRef = searchParams.get("tx_ref") || searchParams.get("transaction_id")
    const subject = encodeURIComponent("Payment Verification Issue")
    const body = encodeURIComponent(
      `Hi Support Team,\n\nI'm having an issue with my payment verification.\n\nTransaction Reference: ${txRef}\nUser ID: ${user?._id}\nEmail: ${user?.email}\n\nError Message: ${message}\n\nPlease assist me with this issue.`
    )
    
    window.location.href = `mailto:support@smartdriller.com?subject=${subject}&body=${body}`
  }

  const formatSubscriptionDetails = () => {
    if (!paymentDetails) return null
    
    return (
      <div className={styles.subscriptionDetails}>
        <h3>Subscription Details</h3>
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Subscription Type:</span>
            <span className={styles.detailValue}>{paymentDetails.subscriptionType}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Status:</span>
            <span className={styles.detailValue}>
              {paymentDetails.isSubscribed ? "Active" : "Inactive"}
            </span>
          </div>
          {paymentDetails.subscriptionExpiry && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Expires:</span>
              <span className={styles.detailValue}>
                {new Date(paymentDetails.subscriptionExpiry).toLocaleDateString()}
              </span>
            </div>
          )}
          {paymentDetails.university?.name && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>University:</span>
              <span className={styles.detailValue}>{paymentDetails.university.name}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.paymentContainer}>
      <div className={`${styles.paymentCard} ${status} ${isAnimating ? styles[`${status}Animation`] : ""}`}>
        <div className={styles.paymentStatus}>
          <div className={styles.statusIcon}>
            <i className={`fas ${getStatusIcon()} ${status === "verifying" ? styles.spinner : ""}`}></i>
          </div>
          
          <h1 className={styles.statusTitle}>
            {status === "success" && "Payment Successful!"}
            {status === "error" && "Payment Failed"}
            {status === "cancelled" && "Payment Cancelled"}
            {status === "verifying" && "Verifying Payment..."}
          </h1>
          
          <p className={styles.statusMessage}>{message}</p>

          {/* Show subscription details on success */}
          {status === "success" && formatSubscriptionDetails()}

          {/* Action buttons based on status */}
          <div className={styles.actionButtons}>
            {status === "error" && retryCount >= maxRetries && (
              <>
                <button
                  onClick={handleRetry}
                  className={styles.payBtn}
                >
                  <div className={styles.btnContent}>
                    <span className={styles.btnText}>Retry Verification</span>
                    <div className={styles.btnArrow}>
                      <i className="fas fa-redo"></i>
                    </div>
                  </div>
                </button>
                <button
                  onClick={handleContactSupport}
                  className={styles.supportBtn}
                >
                  <div className={styles.btnContent}>
                    <span className={styles.btnText}>Contact Support</span>
                    <div className={styles.btnArrow}>
                      <i className="fas fa-envelope"></i>
                    </div>
                  </div>
                </button>
              </>
            )}
            
            {(status === "success" || status === "cancelled" || 
              (status === "error" && retryCount < maxRetries)) && (
              <button
                onClick={() => navigate("/home")}
                className={styles.payBtn}
              >
                <div className={styles.btnContent}>
                  <span className={styles.btnText}>
                    {status === "success" ? "Continue to Dashboard" : "Go to Home"}
                  </span>
                  <div className={styles.btnArrow}>
                    <i className="fas fa-arrow-right"></i>
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* Show transaction reference for errors */}
          {status === "error" && (
            <div className={styles.transactionInfo}>
              <p>If you believe this is an error, please contact our support team with your transaction reference:</p>
              <div className={styles.transactionRef}>
                <span className={styles.refLabel}>Transaction Reference:</span>
                <span className={styles.refValue}>
                  {searchParams.get("tx_ref") || searchParams.get("transaction_id")}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentCallback