"use client"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import styles from "../../styles/auth.module.css"
import api from "../../utils/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resetToken, setResetToken] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    try {
      const response = await api.post("/auth/forgot-password", { email })
      // Store the token for immediate use
      setResetToken(response.data.resetToken)
    } catch (error) {
      console.error("Forgot password error:", error)
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        setError(error.response.data.message || "Failed to generate reset token")
      } else if (error.request) {
        // The request was made but no response was received
        setError("No response from server. Please check your connection.")
      } else {
        // Something happened in setting up the request that triggered an Error
        setError("Failed to generate reset token: " + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // If we have a token, redirect to reset page
  if (resetToken) {
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
                <div className={styles.iconCircle} style={{ background: "#51cf66" }}>
                  <i className="fas fa-check"></i>
                </div>
              </div>
              <h1>Reset Token Generated!</h1>
              <p>Your password reset token has been generated. You can now reset your password.</p>
              <Link 
                to={`/reset-password/${resetToken}`} 
                className={`${styles.submitBtn} ${styles.fullWidth}`}
                style={{ marginTop: "1.5rem", display: "inline-block", textAlign: "center" }}
              >
                Reset Password
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
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
              <i className={`fas fa-arrow-right ${styles.btnArrow}`}></i>
            </button>
          </form>
          
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