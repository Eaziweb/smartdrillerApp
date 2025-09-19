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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    number: false,
    specialChar: false,
  })
  
  const { token } = useParams()
  const navigate = useNavigate()

  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    const criteria = {
      length: password.length >= 6,
      number: /\d/.test(password),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    }
    
    setPasswordCriteria(criteria)
    
    let strength = 0
    if (criteria.length) strength += 33
    if (criteria.number) strength += 33
    if (criteria.specialChar) strength += 34
    
    setPasswordStrength(strength)
  }

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
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    if (name === "password") {
      calculatePasswordStrength(value)
    }
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

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 33) return "#ff6b6b" // Red
    if (passwordStrength <= 66) return "#ffd43b" // Yellow
    return "#51cf66" // Green
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
              <div className={styles.passwordInputContainer}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your new password"
                  minLength="6"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <i className="fas fa-eye-slash"></i>
                  ) : (
                    <i className="fas fa-eye"></i>
                  )}
                </button>
              </div>
              
              <div className={styles.passwordStrengthContainer}>
                <div className={styles.passwordStrengthBar}>
                  <div
                    className={styles.passwordStrengthFill}
                    style={{ 
                      width: `${passwordStrength}%`,
                      backgroundColor: getPasswordStrengthColor()
                    }}
                  ></div>
                </div>
                <div className={styles.passwordCriteria}>
                  <div className={`${styles.criteriaItem} ${passwordCriteria.length ? styles.met : ''}`}>
                    <i className={`fas ${passwordCriteria.length ? 'fa-check-circle' : 'fa-circle'}`}></i>
                    <span>At least 6 characters</span>
                  </div>
                  <div className={`${styles.criteriaItem} ${passwordCriteria.number ? styles.met : ''}`}>
                    <i className={`fas ${passwordCriteria.number ? 'fa-check-circle' : 'fa-circle'}`}></i>
                    <span>At least one number</span>
                  </div>
                  <div className={`${styles.criteriaItem} ${passwordCriteria.specialChar ? styles.met : ''}`}>
                    <i className={`fas ${passwordCriteria.specialChar ? 'fa-check-circle' : 'fa-circle'}`}></i>
                    <span>At least one special character</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className={styles.passwordInputContainer}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <i className="fas fa-eye-slash"></i>
                  ) : (
                    <i className="fas fa-eye"></i>
                  )}
                </button>
              </div>
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