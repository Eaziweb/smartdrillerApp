"use client"
import { useState, useEffect, useRef } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useNotification } from "../../contexts/NotificationContext"
import axios from "axios"
import styles from "../../styles/auth.module.css"

const VerifyEmail = () => {
  const [code, setCode] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [email, setEmail] = useState("")
  const inputRefs = useRef([])
  const { showNotification } = useNotification()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Get email from navigation state or localStorage
    const emailFromState = location.state?.email
    const emailFromStorage = localStorage.getItem("verificationEmail")
    if (emailFromState) {
      setEmail(emailFromState)
      localStorage.setItem("verificationEmail", emailFromState)
    } else if (emailFromStorage) {
      setEmail(emailFromStorage)
    } else {
      navigate("/register")
    }
  }, [location.state, navigate])

  useEffect(() => {
    // Countdown timer for resend
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text')
    if (pastedData.length === 6 && /^\d+$/.test(pastedData)) {
      const newCode = pastedData.split('')
      setCode(newCode)
      // Focus the last input
      setTimeout(() => {
        inputRefs.current[5]?.focus()
      }, 0)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const verificationCode = code.join("")
    if (verificationCode.length !== 6) {
      showNotification("Please enter the complete 6-digit code", "error")
      return
    }
    setLoading(true)
    try {
      const response = await axios.post("/api/auth/verify-email", {
        email,
        code: verificationCode,
      })
      if (response.data.success) {
        localStorage.removeItem("verificationEmail")
        showNotification("Email verified successfully!", "success")
        navigate("/login")
      } else {
        showNotification(response.data.message || "Invalid verification code", "error")
        // Clear code inputs on error
        setCode(["", "", "", "", "", ""])
        inputRefs.current[0]?.focus()
      }
    } catch (error) {
      showNotification(error.response?.data?.message || "Verification failed", "error")
      setCode(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    setResendLoading(true)
    try {
      const response = await axios.post("/api/auth/resend-verification", { email })
      if (response.data.success) {
        showNotification("Verification code resent successfully!", "success")
        setCountdown(60)
      } else {
        showNotification(response.data.message || "Failed to resend code", "error")
      }
    } catch (error) {
      showNotification(error.response?.data?.message || "Failed to resend code", "error")
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className={styles.authPage}>
      <div className={`${styles.authContainer} ${styles.verifyContainer}`}>
        <div className={styles.authHeader}>
          <Link to="/register" className={styles.backBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <h1 className={styles.appLogo}>SmartDrill</h1>
        </div>
        
        <div className={`${styles.formContainer} ${styles.verifyForm}`}>
          <div className={styles.verifyIcon}>
            <div className={styles.emailAnimation}>
              <div className={styles.emailIcon}>✉️</div>
              <div className={styles.pulseRing}></div>
            </div>
          </div>
          
          <div className={styles.formHeader}>
            <h1>Check Your Email</h1>
            <p>We've sent a 6-digit verification code to</p>
            <div className={styles.emailDisplay}>{email}</div>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.modernForm}>
            <div className={styles.codeSection}>
              <label>Enter Verification Code</label>
              <div className={styles.codeInputs}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    className={styles.codeInput}
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    autoComplete="off"
                  />
                ))}
              </div>
              <div className={styles.inputFeedback}>
                <span className={styles.errorMsg} id="codeError"></span>
              </div>
            </div>
            
            <button type="submit" className={`${styles.submitBtn} ${loading ? styles.loading : ""}`} disabled={loading}>
              <span className={styles.btnContent}>
                <span className={styles.btnText}>Verify Email</span>
                <div className={styles.btnLoader}>
                  <div className={styles.spinner}></div>
                </div>
              </span>
              <div className={styles.btnArrow}>→</div>
            </button>
          </form>
          
          <div className={styles.resendSection}>
            <p>Didn't receive the code?</p>
            {countdown > 0 ? (
              <div className={`${styles.resendTimer} ${styles.active}`}>
                <span>Resend in </span>
                <span className={styles.countdown}>{countdown}</span>
                <span>s</span>
              </div>
            ) : (
              <button type="button" className={styles.resendBtn} onClick={handleResend} disabled={resendLoading}>
                {resendLoading ? "Sending..." : "Resend Code"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail