"use client"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import styles from "../../styles/auth.module.css"
import api from "../../utils/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [resetToken, setResetToken] = useState("")
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")
    
    try {
      const response = await api.post("/api/auth/forgot-password", { email })
      
      if (response.data.resetToken) {
        setResetToken(response.data.resetToken)
        setMessage("Password reset token generated! Click the button below to reset your password.")
      } else {
        setMessage(response.data.message)
      }
    } catch (error) {
      console.error("Forgot password error:", error)
      setError(error.response?.data?.message || "Failed to generate reset token")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = () => {
    if (resetToken) {
      navigate(`/reset-password/${resetToken}`)
    }
  }

  return (
    <div className={styles.authPage}>
      <div className={`${styles.authContainer} ${styles.resetContainer}`}>
        <div className={styles.authHeader}>
          <Link to="/login" className={styles.backBtn}>
            <i className="fas fa-arrow-left"></i>
          </Link>
          <h1 className={styles.appLogo}>SmartDriller</h1>
        </div>
        
        <div className={styles.resetForm}>
          <div className={styles.formHeader}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div className={styles.iconCircle}>
                <i className="fas fa-key"></i>
              </div>
            </div>
            <h1>Forgot Password?</h1>
            <p>Enter your email address to generate a password reset token</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}
            {message && (
              <div className={styles.successMessage}>
                {message}
              </div>
            )}
            
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email address"
              />
            </div>
            
            <button 
              type="submit" 
              className={`${styles.submitBtn} ${loading ? styles.loading : ""}`} 
              disabled={loading}
            >
              <div className={styles.btnContent}>
                <span className={styles.btnText}>Generate Reset Token</span>
                <div className={styles.btnLoader}>
                  <div className={styles.spinner}></div>
                </div>
              </div>
              <i className={`fas fa-key ${styles.btnArrow}`}></i>
            </button>
          </form>
          
          {resetToken && (
            <div className={styles.resetTokenSection}>
              <p>Your reset token has been generated. Click the button below to reset your password.</p>
              <button 
                onClick={handleResetPassword}
                className={styles.resetPasswordBtn}
              >
                Reset Password
              </button>
            </div>
          )}
          
          <div className={styles.formFooter}>
            <p>
              Remember your password?{" "}
              <Link to="/login" className={styles.link}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword   