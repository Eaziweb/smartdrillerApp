"use client"
import { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/auth.module.css"
import api from "../../utils/api"

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    university: "",
    course: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [currentSection, setCurrentSection] = useState(0)
  const [universities, setUniversities] = useState([])
  const [courses, setCourses] = useState([])
  const [loadingUniversities, setLoadingUniversities] = useState(true)
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    number: false,
    specialChar: false,
  })
  const [courseSearchTerm, setCourseSearchTerm] = useState("")
  const [showCourseDropdown, setShowCourseDropdown] = useState(false)
  const [filteredCourses, setFilteredCourses] = useState([])

  // Email verification step
  const [showVerification, setShowVerification] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)

  const { register } = useAuth()
  const navigate = useNavigate()
  const formRef = useRef(null)
  const courseSearchRef = useRef(null)
  const universityRetryRef = useRef(null)
  const courseRetryRef = useRef(null)

  // ── Data fetching ──────────────────────────────────────

  const fetchUniversities = (retryCount = 0) => {
    setLoadingUniversities(true)
    api.get("/api/universities")
      .then((response) => {
        if (response.data && Array.isArray(response.data.universities)) {
          setUniversities(response.data.universities)
          setLoadingUniversities(false)
        } else {
          throw new Error("Invalid universities data format")
        }
      })
      .catch((error) => {
        console.error(`Failed to fetch universities (attempt ${retryCount + 1}):`, error)
        if (retryCount < 5) {
          const delay = Math.pow(2, retryCount) * 1000
          universityRetryRef.current = setTimeout(() => fetchUniversities(retryCount + 1), delay)
        } else {
          universityRetryRef.current = setTimeout(() => fetchUniversities(0), 30000)
        }
      })
  }

  const fetchCourses = (retryCount = 0) => {
    setLoadingCourses(true)
    api.get("/api/courseofstudy")
      .then((response) => {
        if (response.data && Array.isArray(response.data.courses)) {
          const nonAdminCourses = response.data.courses.filter(
            (course) => course.category.toLowerCase() !== "administration"
          )
          setCourses(nonAdminCourses)
          setFilteredCourses(nonAdminCourses)
          setLoadingCourses(false)
        } else {
          throw new Error("Invalid courses data format")
        }
      })
      .catch((error) => {
        console.error(`Failed to fetch courses (attempt ${retryCount + 1}):`, error)
        if (retryCount < 5) {
          const delay = Math.pow(2, retryCount) * 1000
          courseRetryRef.current = setTimeout(() => fetchCourses(retryCount + 1), delay)
        } else {
          courseRetryRef.current = setTimeout(() => fetchCourses(0), 30000)
        }
      })
  }

  useEffect(() => {
    fetchUniversities()
    fetchCourses()
    return () => {
      if (universityRetryRef.current) clearTimeout(universityRetryRef.current)
      if (courseRetryRef.current) clearTimeout(courseRetryRef.current)
    }
  }, [])

  // ── Resend cooldown timer ──────────────────────────────

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // ── Course search filter ───────────────────────────────

  useEffect(() => {
    if (courseSearchTerm.trim() === "") {
      setFilteredCourses(courses)
    } else {
      setFilteredCourses(
        courses.filter((course) =>
          course.name.toLowerCase().includes(courseSearchTerm.toLowerCase())
        )
      )
    }
  }, [courseSearchTerm, courses])

  // ── Click outside dropdown ─────────────────────────────

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (courseSearchRef.current && !courseSearchRef.current.contains(event.target)) {
        setShowCourseDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // ── Arrow key navigation ───────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") handlePrev()
      else if (e.key === "ArrowRight" && currentSection < 2) handleNext()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentSection])

  // ── Password strength ──────────────────────────────────

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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (name === "password") calculatePasswordStrength(value)
  }

  const handleCourseSearch = (e) => {
    setCourseSearchTerm(e.target.value)
    setShowCourseDropdown(true)
  }

  const handleCourseSelect = (course) => {
    setFormData({ ...formData, course: course._id || course.id })
    setCourseSearchTerm(course.name)
    setShowCourseDropdown(false)
  }

  // ── Section navigation ─────────────────────────────────

  const handleNext = () => {
    if (currentSection === 0) {
      if (!formData.fullName.trim()) { setError("Please enter your full name"); return }
      if (!formData.email.trim()) { setError("Please enter your email address"); return }
      if (!isValidEmail(formData.email)) { setError("Please enter a valid email address"); return }
    }
    if (currentSection === 1) {
      if (!formData.password) { setError("Please enter a password"); return }
      if (formData.password.length < 6) { setError("Password must be at least 6 characters"); return }
      if (formData.password !== formData.confirmPassword) { setError("Passwords do not match"); return }
    }
    setError("")
    if (currentSection < 2) setCurrentSection(currentSection + 1)
  }

  const handlePrev = () => {
    if (currentSection > 0) setCurrentSection(currentSection - 1)
  }

  // ── Submit registration ────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.university) { setError("Please select your university"); return }
    if (!formData.course) { setError("Please select your course"); return }

    setLoading(true)
    setError("")

    try {
      const result = await register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        university: formData.university,
        course: formData.course,
      })

      if (result.success) {
        // Registration done, now show email verification screen
        setShowVerification(true)
        setResendCooldown(60)
        setSuccess("Account created! Please check your email for the verification code.")
      } else {
        setError(result.message)
      }
    } catch (error) {
      setError(error.response?.data?.message || "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // ── Submit verification code ───────────────────────────

  const handleVerifyEmail = async (e) => {
    e.preventDefault()
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setError("Please enter the 6-digit code sent to your email")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await api.post("/api/auth/verify-email", {
        email: formData.email,
        code: verificationCode,
      })

      if (response.data.success) {
        navigate("/congratulations")
      } else {
        setError(response.data.message || "Verification failed")
      }
    } catch (error) {
      setError(error.response?.data?.message || "Verification failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // ── Resend code ────────────────────────────────────────

  const handleResendCode = async () => {
    if (resendCooldown > 0) return
    setLoading(true)
    setError("")

    try {
      await api.post("/api/auth/resend-verification", { email: formData.email })
      setSuccess("A new verification code has been sent to your email.")
      setResendCooldown(60)
    } catch (error) {
      setError(error.response?.data?.message || "Failed to resend code. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // ── Helpers ────────────────────────────────────────────

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const getProgressPercentage = () => ((currentSection + 1) / 3) * 100
  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 33) return "#ff6b6b"
    if (passwordStrength <= 66) return "#ffd43b"
    return "#51cf66"
  }

  // ── Verification Screen ────────────────────────────────

  if (showVerification) {
    return (
      <div className={styles.authPage}>
        <div className={styles.authContainer}>
          <div className={styles.authHeader}>
            <button
              className={styles.backBtn}
              onClick={() => setShowVerification(false)}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <h1 className={styles.appLogo}>SmartDriller</h1>
          </div>

          <div className={styles.formContainer}>
            <div className={styles.formHeader}>
              <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📧</div>
              <h1>Check Your Email</h1>
              <p>
                We sent a 6-digit code to <strong>{formData.email}</strong>
              </p>
            </div>

            <form onSubmit={handleVerifyEmail}>
              {error && <div className={styles.errorMessage}>{error}</div>}
              {success && <div className={styles.successMessage}>{success}</div>}

              <div className={styles.inputGroup}>
                <label htmlFor="verificationCode">Verification Code</label>
                <input
                  type="text"
                  id="verificationCode"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  disabled={loading}
                  style={{ letterSpacing: "0.5rem", fontSize: "1.4rem", textAlign: "center" }}
                />
              </div>

              <button
                type="submit"
                className={`${styles.submitBtn} ${loading ? styles.loading : ""}`}
                disabled={loading}
              >
                <div className={styles.btnContent}>
                  <span className={styles.btnText}>Verify Email</span>
                  <div className={styles.btnLoader}>
                    <div className={styles.spinner}></div>
                  </div>
                </div>
                <i className={`fas fa-check ${styles.btnArrow}`}></i>
              </button>
            </form>

            <div className={styles.formFooter}>
              <p>
                Didn't receive the code?{" "}
                <button
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || loading}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
                    color: resendCooldown > 0 ? "#999" : "#0066ff",
                    fontWeight: "bold",
                    padding: 0,
                  }}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Main Registration Form ─────────────────────────────

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

        <div className={styles.formContainer} ref={formRef}>
          <div className={styles.formHeader}>
            <h1>Create Your Account</h1>
            <p>Let's get you started on your learning journey</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div className={styles.errorMessage}>{error}</div>}
            {success && <div className={styles.successMessage}>{success}</div>}

            {/* Section 0 — Personal Info */}
            {currentSection === 0 && (
              <div className={`${styles.formSection} ${styles.active}`}>
                <div className={styles.sectionTitle}>
                  <div className={styles.sectionIcon}><i className="fas fa-user"></i></div>
                  <span>Personal Information</span>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="fullName">Full Name</label>
                  <input type="text" id="fullName" name="fullName" value={formData.fullName}
                    onChange={handleChange} required placeholder="Enter your full name" />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="email">Email Address</label>
                  <input type="email" id="email" name="email" value={formData.email}
                    onChange={handleChange} required placeholder="Enter your email" />
                </div>

                <button type="button" onClick={handleNext} className={styles.submitBtn}>
                  <div className={styles.btnContent}>
                    <span className={styles.btnText}>Continue</span>
                  </div>
                  <i className={`fas fa-arrow-right ${styles.btnArrow}`}></i>
                </button>
              </div>
            )}

            {/* Section 1 — Security */}
            {currentSection === 1 && (
              <div className={`${styles.formSection} ${styles.active}`}>
                <div className={styles.sectionTitle}>
                  <div className={styles.sectionIcon}><i className="fas fa-lock"></i></div>
                  <span>Security</span>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="password">Password</label>
                  <div className={styles.passwordInputContainer}>
                    <input type={showPassword ? "text" : "password"} id="password" name="password"
                      value={formData.password} onChange={handleChange} required
                      placeholder="Create a strong password" minLength="6" />
                    <button type="button" className={styles.passwordToggle}
                      onClick={() => setShowPassword(!showPassword)}>
                      <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                    </button>
                  </div>

                  <div className={styles.passwordStrengthContainer}>
                    <div className={styles.passwordStrengthBar}>
                      <div className={styles.passwordStrengthFill}
                        style={{ width: `${passwordStrength}%`, backgroundColor: getPasswordStrengthColor() }}
                      ></div>
                    </div>
                    <div className={styles.passwordCriteria}>
                      {[
                        { key: "length", label: "At least 6 characters" },
                        { key: "number", label: "At least one number" },
                        { key: "specialChar", label: "At least one special character" },
                      ].map(({ key, label }) => (
                        <div key={key} className={`${styles.criteriaItem} ${passwordCriteria[key] ? styles.met : ""}`}>
                          <i className={`fas ${passwordCriteria[key] ? "fa-check-circle" : "fa-circle"}`}></i>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className={styles.passwordInputContainer}>
                    <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword"
                      name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                      required placeholder="Confirm your password" />
                    <button type="button" className={styles.passwordToggle}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <i className={`fas ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1rem" }}>
                  <button type="button" onClick={handlePrev} className={styles.submitBtn}
                    style={{ background: "#6c757d" }}>
                    <i className="fas fa-arrow-left"></i> <span>Back</span>
                  </button>
                  <button type="button" onClick={handleNext} className={styles.submitBtn} style={{ flex: 1 }}>
                    <span>Continue</span> <i className="fas fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            )}

            {/* Section 2 — Academic */}
            {currentSection === 2 && (
              <div className={`${styles.formSection} ${styles.active}`}>
                <div className={styles.sectionTitle}>
                  <div className={styles.sectionIcon}><i className="fas fa-graduation-cap"></i></div>
                  <span>Academic Information</span>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="university">Select Your University</label>
                  <select id="university" name="university" value={formData.university}
                    onChange={handleChange} required className={styles.courseSelect}
                    disabled={loadingUniversities}>
                    <option value="">
                      {loadingUniversities ? "Loading universities..." : "Choose your university"}
                    </option>
                    {Array.isArray(universities) && universities.map((university) => (
                      <option key={`university-${university._id || university.id}`}
                        value={university._id || university.id}>
                        {university.name}
                      </option>
                    ))}
                    {!loadingUniversities && (!universities || universities.length === 0) && (
                      <option value="" disabled>No universities available</option>
                    )}
                  </select>
                  {loadingUniversities && (
                    <div className={styles.loadingIndicator}>
                      <div className={styles.spinner}></div>
                      <span>Fetching universities...</span>
                    </div>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="course">Select Your Course</label>
                  <div className={styles.courseSearchContainer} ref={courseSearchRef}>
                    <input type="text" id="course" name="course" value={courseSearchTerm}
                      onChange={handleCourseSearch} onFocus={() => setShowCourseDropdown(true)}
                      placeholder={loadingCourses ? "Loading courses..." : "Search for your course..."}
                      className={styles.courseSearchInput} disabled={loadingCourses} required />
                    <button type="button" className={styles.courseDropdownToggle}
                      onClick={() => setShowCourseDropdown(!showCourseDropdown)} disabled={loadingCourses}>
                      <i className={`fas fa-chevron-${showCourseDropdown ? "up" : "down"}`}></i>
                    </button>
                    {showCourseDropdown && (
                      <div className={styles.courseDropdown}>
                        {loadingCourses ? (
                          <div className={styles.courseDropdownLoading}>
                            <div className={styles.spinner}></div> Loading courses...
                          </div>
                        ) : filteredCourses.length > 0 ? (
                          <ul className={styles.courseDropdownList}>
                            {filteredCourses.map((course, index) => (
                              <li key={`course-${course._id || course.id || index}`}
                                onClick={() => handleCourseSelect(course)}
                                className={styles.courseDropdownItem}>
                                {course.name}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className={styles.courseDropdownNoResults}>
                            No courses found. Try a different search term.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {loadingCourses && (
                    <div className={styles.loadingIndicator}>
                      <div className={styles.spinner}></div>
                      <span>Fetching courses...</span>
                    </div>
                  )}
                </div>

                <div className={styles.termsNotice}>
                  <p>
                    By creating an account, you agree to our{" "}
                    <Link to="/terms" className={styles.link}>Terms of Service</Link> and{" "}
                    <Link to="/privacy" className={styles.link}>Privacy Policy</Link>.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "1rem" }}>
                  <button type="button" onClick={handlePrev} className={styles.submitBtn}
                    style={{ background: "#6c757d" }}>
                    <i className="fas fa-arrow-left"></i> <span>Back</span>
                  </button>
                  <button type="submit"
                    className={`${styles.submitBtn} ${loading ? styles.loading : ""}`}
                    disabled={loading || loadingUniversities || loadingCourses} style={{ flex: 1 }}>
                    <div className={styles.btnContent}>
                      <span className={styles.btnText}>Create Account</span>
                      <div className={styles.btnLoader}><div className={styles.spinner}></div></div>
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
              <Link to="/login" className={styles.link}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register