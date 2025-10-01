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
  const maxRetries = 3

  useEffect(() => {
    verifyPayment()
  }, [])

  const verifyPayment = async () => {
    try {
      const transactionId = searchParams.get("transaction_id")
      const txRef = searchParams.get("tx_ref")
      const statusParam = searchParams.get("status")

      if (!txRef) {
        setStatus("error")
        setMessage("Invalid payment parameters")
        setIsAnimating(true)
        return
      }

      if (statusParam === "cancelled") {
        setStatus("cancelled")
        setMessage("Payment was cancelled")
        setIsAnimating(true)
        setTimeout(() => navigate("/home"), 3000)
        return
      }

      console.log("Verifying payment with txRef:", txRef)
      
      const response = await api.post(`/api/payments/verify/${txRef}`)
      console.log("Payment verification response:", response.data)

      if (response.data.status === "success") {
        setStatus("success")
        setMessage("Payment successful! Your subscription has been activated.")
        setIsAnimating(true)
        
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
      
      // Implement retry logic
      if (retryCount < maxRetries) {
        setRetryCount(prevCount => prevCount + 1)
        setMessage(`Verifying payment... (Attempt ${retryCount + 1} of ${maxRetries})`)
        
        // Exponential backoff for retries
        const delay = Math.pow(2, retryCount) * 1000
        setTimeout(verifyPayment, delay)
      } else {
        setStatus("error")
        setMessage("An error occurred while verifying payment. Please contact support.")
        setIsAnimating(true)
      }
    }
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
    setStatus("verifying")
    setMessage("Retrying payment verification...")
    setRetryCount(0)
    setIsAnimating(false)
    verifyPayment()
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

          {status === "error" && retryCount >= maxRetries && (
            <div className={styles.actionButtons}>
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
                onClick={() => navigate("/home")}
                className={styles.payBtn}
              >
                <div className={styles.btnContent}>
                  <span className={styles.btnText}>Continue to Dashboard</span>
                  <div className={styles.btnArrow}>
                    <i className="fas fa-arrow-right"></i>
                  </div>
                </div>
              </button>
            </div>
          )}

          {status !== "verifying" && status !== "error" && (
            <div className={styles.actionButtons}>
              <button
                onClick={() => navigate("/home")}
                className={styles.payBtn}
              >
                <div className={styles.btnContent}>
                  <span className={styles.btnText}>Continue to Dashboard</span>
                  <div className={styles.btnArrow}>
                    <i className="fas fa-arrow-right"></i>
                  </div>
                </div>
              </button>
            </div>
          )}

          {status === "error" && (
            <div className={styles.errorNote}>
              <p>If you believe this is an error, please contact our support team with your transaction reference:</p>
              <p><strong>{searchParams.get("tx_ref")}</strong></p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentCallback