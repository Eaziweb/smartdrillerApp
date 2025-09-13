"use client"
import { useState, useEffect } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import styles from "../../styles/auth.module.css"

const ResetPassword = () => {
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState(null)
  const { token } = useParams()
  const navigate = useNavigate()

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("Invalid reset link")
        setTokenValid(false)
        return
      }
      try {
        const response = await axios.get(`/api/auth/verify-reset-token/${token}`)
        setTokenValid(response.data.valid)
        if (!response.data.valid) {
          setError(response.data.message)
        }
      } catch (error) {
        setError(error.response?.data?.message || "Invalid reset link")
        setTokenValid(false)
      }
    }
    verifyToken()
  }, [token])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }
    
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }
    
    setLoading(true)
    setError("")
    
    try {
      const response = await axios.post(`/api/auth/reset-password/${token}`, {
        password: formData.password,
      })
      
      if (response.data.message) {
        setSuccess(true)
        setTimeout(() => {
          navigate("/login")
        }, 3000)
      }
    } catch (error) {
      console.error("Reset password error:", error)
      setError(error.response?.data?.message || "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={styles.authPage}>
        <div className={`${styles.authContainer} ${styles.successContainer}`}>
          <div className={styles.authHeader}>
            <Link to="/login" className={styles.backBtn}>
              <i className="fas fa-arrow-left"></i>
            </Link>
            <h1 className={styles.appLogo}>SmartDrill</h1>
          </div>
          <div className={styles.successForm}>
            <div className={styles.formHeader}>
              <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <div className={styles.iconCircle} style={{ background: "#51cf66" }}>
                  <i className="fas fa-check"></i>
                </div>
              </div>
              <h1>Password Reset Successful!</h1>
              <p>Your password has been successfully reset. You can now sign in with your new password.</p>
              <p style={{ marginTop: "1rem", color: "#6c757d" }}>Redirecting to login page...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (tokenValid === false) {
    return (
      <div className={styles.authPage}>
        <div className={styles.authContainer}>
          <div className={styles.authHeader}>
            <Link to="/login" className={styles.backBtn}>
              <i className="fas fa-arrow-left"></i>
            </Link>
            <h1 className={styles.appLogo}>SmartDrill</h1>
          </div>
          <div className={styles.resetForm}>
            <div className={styles.formHeader}>
              <h1>Invalid Reset Link</h1>
              <p>{error}</p>
              <Link to="/forgot-password" className={styles.link}>
                Request a new reset link
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (tokenValid === null) {
    return (
      <div className={styles.authPage}>
        <div className={styles.authContainer}>
          <div className={styles.authHeader}>
            <Link to="/login" className={styles.backBtn}>
              <i className="fas fa-arrow-left"></i>
            </Link>
            <h1 className={styles.appLogo}>SmartDrill</h1>
          </div>
          <div className={styles.resetForm}>
            <div className={styles.formHeader}>
              <h1>Verifying Reset Link</h1>
              <p>Please wait while we verify your reset link...</p>
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
          <h1 className={styles.appLogo}>SmartDrill</h1>
        </div>
        <div className={styles.resetForm}>
          <div className={styles.formHeader}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div className={styles.iconCircle}>
                <i className="fas fa-lock"></i>
              </div>
            </div>
            <h1>Reset Your Password</h1>
            <p>Enter your new password below</p>
          </div>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}
            <div className={styles.inputGroup}>
              <label htmlFor="password">New Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your new password"
                minLength="6"
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm your new password"
              />
            </div>
            <button 
              type="submit" 
              className={`${styles.submitBtn} ${loading ? styles.loading : ""}`} 
              disabled={loading}
            >
              <div className={styles.btnContent}>
                <span className={styles.btnText}>Reset Password</span>
                <div className={styles.btnLoader}>
                  <div className={styles.spinner}></div>
                </div>
              </div>
              <i className={`fas fa-check ${styles.btnArrow}`}></i>
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

export default ResetPassword