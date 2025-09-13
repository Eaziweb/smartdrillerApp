"use client"
import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import styles from "../../styles/payment.module.css"

const PaymentCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const [status, setStatus] = useState("verifying")
  const [message, setMessage] = useState("Verifying your payment...")

  useEffect(() => {
    verifyPayment()
  }, [])

  const verifyPayment = async () => {
    try {
      const transactionId = searchParams.get("transaction_id")
      const txRef = searchParams.get("tx_ref")
      const status = searchParams.get("status")

      if (!txRef) {
        setStatus("error")
        setMessage("Invalid payment parameters")
        return
      }

      if (status === "cancelled") {
        setStatus("cancelled")
        setMessage("Payment was cancelled")
        setTimeout(() => navigate("/home"), 3000)
        return
      }

      const response = await axios.post(`/api/payments/verify/${txRef}`)

      if (response.data.status === "success") {
        setStatus("success")
        setMessage("Payment successful! Your subscription has been activated.")
        if (updateUser) {
          updateUser(response.data.user)
        }
        setTimeout(() => navigate("/home"), 3000)
      } else {
        setStatus("error")
        setMessage("Payment verification failed. Please contact support.")
      }
    } catch (error) {
      console.error("Payment verification error:", error)
      setStatus("error")
      setMessage("An error occurred while verifying payment. Please contact support.")
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
        return "fa-spinner fa-spin"
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "#4CAF50"
      case "error":
        return "#f44336"
      case "cancelled":
        return "#ff9800"
      default:
        return "#2196F3"
    }
  }

  return (
    <div className={styles.paymentContainer}>
      <div className={styles.paymentCard}>
        <div
          className={styles.paymentStatus}
          style={{ textAlign: "center", padding: "3rem 2rem" }}
        >
          <div
            style={{
              fontSize: "4rem",
              color: getStatusColor(),
              marginBottom: "2rem",
            }}
          >
            <i className={`fas ${getStatusIcon()}`}></i>
          </div>
          <h1 className={styles.statusTitle}>
            {status === "success" && "Payment Successful!"}
            {status === "error" && "Payment Failed"}
            {status === "cancelled" && "Payment Cancelled"}
            {status === "verifying" && "Verifying Payment..."}
          </h1>
          <p className={styles.statusMessage}>{message}</p>

          {status !== "verifying" && (
            <div style={{ marginTop: "2rem" }}>
              <button
                onClick={() => navigate("/home")}
                className={styles.payBtn}
              >
                <span className="btn-content">
                  <span className="btn-text">Continue to Dashboard</span>
                </span>
                <div className="btn-arrow">
                  <i className="fas fa-arrow-right"></i>
                </div>
              </button>
            </div>
          )}

          {status === "error" && (
            <div style={{ marginTop: "1rem" }}>
              <p className={styles.errorNote}>
                If you believe this is an error, please contact our support team.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentCallback
