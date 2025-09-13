"use client"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/auth.module.css"

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    course: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [currentSection, setCurrentSection] = useState(0)
  const { register } = useAuth()
  const navigate = useNavigate()
  
  const courses = [
    "Computer Science",
    "Engineering",
    "Medicine",
    "Law",
    "Business Administration",
    "Economics",
    "Psychology",
    "Biology",
    "Chemistry",
    "Physics",
    "Mathematics",
    "English Literature",
    "History",
    "Political Science",
    "Sociology",
    "Other",
  ]
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }
  
  const handleNext = () => {
    if (currentSection < 2) {
      setCurrentSection(currentSection + 1)
    }
  }
  
  const handlePrev = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1)
    }
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }
    
    setLoading(true)
    setError("")
    
    const result = await register({
      fullName: formData.fullName,
      email: formData.email,
      password: formData.password,
      course: formData.course,
    })
    
    if (result.success) {
      navigate("/verify-email", { 
        state: { email: formData.email } 
      })
    } else {
      setError(result.message)
    }
    
    setLoading(false)
  }
  
  const getProgressPercentage = () => {
    return currentSection * 50; // 0%, 50%, 100%
  }
  
  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        <div className={styles.authHeader}>
          <Link to="/" className={styles.backBtn}>
            <i className="fas fa-arrow-left"></i>
          </Link>
          <h1 className={styles.appLogo}>SmartDriller</h1>
        </div>
        
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${getProgressPercentage()}%` }}></div>
          </div>
          <div className={styles.progressText}>
            <span>Complete your profile</span>
            <span>{Math.round(getProgressPercentage())}%</span>
          </div>
        </div>
        
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h1>Create Your Account</h1>
            <p>Let's get you started on your learning journey</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}
            
            {/* Personal Information Section */}
            {currentSection === 0 && (
              <div className={`${styles.formSection} ${styles.active}`}>
                <div className={styles.sectionTitle}>
                  <div className={styles.sectionIcon}>
                    <i className="fas fa-user"></i>
                  </div>
                  <span>Personal Information</span>
                </div>
                
                <div className={styles.inputGroup}>
                  <label htmlFor="fullName">Full Name</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className={styles.inputGroup}>
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email"
                  />
                </div>
                
                <button type="button" onClick={handleNext} className={styles.submitBtn}>
                  <div className={styles.btnContent}>
                    <span className={styles.btnText}>Continue</span>
                  </div>
                  <i className={`fas fa-arrow-right ${styles.btnArrow}`}></i>
                </button>
              </div>
            )}
            
            {/* Security Section */}
            {currentSection === 1 && (
              <div className={`${styles.formSection} ${styles.active}`}>
                <div className={styles.sectionTitle}>
                  <div className={styles.sectionIcon}>
                    <i className="fas fa-lock"></i>
                  </div>
                  <span>Security</span>
                </div>
                
                <div className={styles.inputGroup}>
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Create a strong password"
                    minLength="6"
                  />
                </div>
                
                <div className={styles.inputGroup}>
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Confirm your password"
                  />
                </div>
                
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    type="button"
                    onClick={handlePrev}
                    className={styles.submitBtn}
                    style={{ background: "#6c757d" }}
                  >
                    <i className="fas fa-arrow-left"></i>
                    <span>Back</span>
                  </button>
                  <button type="button" onClick={handleNext} className={styles.submitBtn} style={{ flex: 1 }}>
                    <span>Continue</span>
                    <i className="fas fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            )}
            
            {/* Course Selection Section */}
            {currentSection === 2 && (
              <div className={`${styles.formSection} ${styles.active}`}>
                <div className={styles.sectionTitle}>
                  <div className={styles.sectionIcon}>
                    <i className="fas fa-graduation-cap"></i>
                  </div>
                  <span>Course Selection</span>
                </div>
                
                <div className={styles.inputGroup}>
                  <label htmlFor="course">Select Your Course</label>
                  <select 
                    id="course" 
                    name="course" 
                    value={formData.course} 
                    onChange={handleChange} 
                    required
                    className={styles.courseSelect}
                  >
                    <option value="">Choose your course</option>
                    {courses.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    type="button"
                    onClick={handlePrev}
                    className={styles.submitBtn}
                    style={{ background: "#6c757d" }}
                  >
                    <i className="fas fa-arrow-left"></i>
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    className={`${styles.submitBtn} ${loading ? styles.loading : ""}`}
                    disabled={loading}
                    style={{ flex: 1 }}
                  >
                    <div className={styles.btnContent}>
                      <span className={styles.btnText}>Create Account</span>
                      <div className={styles.btnLoader}>
                        <div className={styles.spinner}></div>
                      </div>
                    </div>
                    <i className={`fas fa-check ${styles.btnArrow}`}></i>
                  </button>
                </div>
              </div>
            )}
          </form>
          
          <div className={styles.formFooter}>
            <p>
              Already have an account?{" "}
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

export default Register