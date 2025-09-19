"use client"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/SuperAdminLogin.module.css"

const SuperAdminLogin = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { superAdminLogin } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await superAdminLogin(formData.email, formData.password)
      if (result.success) {
        navigate("/superadmin/dashboard")
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        <div className={styles.authHeader}>
          <Link to="/login" className={styles.backBtn}>
            <i className="fas fa-arrow-left"></i>
          </Link>
          <h1 className={styles.appLogo}>SmartDriller SuperAdmin</h1>
        </div>
        <div className={styles.signinForm}>
          <div className={styles.formHeader}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  background: "var(--gradient-primary)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                  color: "white",
                  fontSize: "2rem",
                }}
              >
                <i className="fas fa-user-tie"></i>
              </div>
            </div>
            <h1>SuperAdmin Access</h1>
            <p>Sign in to access the superadmin dashboard</p>
          </div>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}
            <div className={styles.inputGroup}>
              <label htmlFor="email">SuperAdmin Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter superadmin email"
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="password">SuperAdmin Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter superadmin password"
              />
            </div>
            <button 
              type="submit" 
              className={`${styles.submitBtn} ${loading ? styles.loading : ""}`} 
              disabled={loading}
            >
              <div className={styles.btnContent}>
                <span className={styles.btnText}>Sign In as SuperAdmin</span>
                <div className={styles.btnLoader}>
                  <div className={styles.spinner}></div>
                </div>
              </div>
              <i className="fas fa-arrow-right btn-arrow"></i>
            </button>
          </form>
          <div className={styles.formFooter}>
            <p>
              <Link to="/admin/login" className={styles.link}>
                Admin Login
              </Link>
            </p>
            <p>
              <Link to="/login" className={styles.link}>
                User Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SuperAdminLogin