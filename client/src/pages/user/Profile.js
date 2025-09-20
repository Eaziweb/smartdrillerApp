"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import api from "../../utils/api";
import styles from "../../styles/profile.module.css"

const Profile = () => {
  const { user, updateUser } = useAuth()
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    accountNumber: "",
    bankName: "",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [universityName, setUniversityName] = useState("")
  const [courseName, setCourseName] = useState("")
  const [loadingCourse, setLoadingCourse] = useState(true)

  // Initialize form data when user is available
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        phoneNumber: user.phoneNumber || "",
        accountNumber: user.accountNumber || "",
        bankName: user.bankName || "",
      })
      
      // Set university name
      if (user.university) {
        if (typeof user.university === 'object' && user.university.name) {
          setUniversityName(user.university.name)
        } else if (typeof user.university === 'string') {
          setUniversityName(user.university)
        }
      } else {
        setUniversityName("University not set")
      }
      
      // Set course name
      if (user.course) {
        if (typeof user.course === 'object' && user.course.name) {
          setCourseName(user.course.name)
          setLoadingCourse(false)
        } else if (typeof user.course === 'string') {
          setCourseName(user.course)
          setLoadingCourse(false)
        } else {
          // If course is an ObjectId, fetch the course name
          fetchCourseName(user.course)
        }
      } else {
        setCourseName("Course not set")
        setLoadingCourse(false)
      }
    }
  }, [user])

  // Fetch course name by ID
  const fetchCourseName = async (courseId) => {
    try {
      const response = await api.get(`/api/courseofstudy/id/${courseId}`)
      setCourseName(response.data.course.name)
    } catch (error) {
      console.error("Failed to fetch course name:", error)
      setCourseName("Course not found")
    } finally {
      setLoadingCourse(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    
    try {
      const response = await api.put("/api/users/profile", formData)
      updateUser(response.data.user)
      setMessage("Profile updated successfully!")
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update profile")
    }
    setLoading(false)
  }

  const getInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"
    )
  }

  const formatDate = (date) => {
    if (!date) return ""
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className={styles.profilePage}>
      <div className={styles.profileContainer}>
        <div className={styles.authHeader}>
          <Link to="/home" className={styles.backBtn}>
            <i className="fas fa-arrow-left"></i>
          </Link>
          <h1 className={styles.appLogo}>SmartDriller</h1>
        </div>
        
        <div className={styles.profileHeader}>
          <div className={styles.profileAvatar}>{getInitials(user?.fullName)}</div>
          <h2>{user?.fullName}</h2>
          <p className={styles.profileEmail}>{user?.email}</p>
          <p className={styles.profileCourse}>
            {loadingCourse ? "Loading course..." : courseName}
          </p>
          <p className={styles.profileUniversity}>{universityName}</p>
          <div className={user?.isSubscribed ? styles.subscribedBadge : styles.notSubscribedBadge}>
            {user?.isSubscribed ? "Subscribed" : "Not Subscribed"}
          </div>
          
          {user?.subscriptionType && (
            <p className={styles.subscriptionType}>
              Subscription Type: {user?.subscriptionType === "monthly" ? "Monthly" : "Semester"}
            </p>
          )}
          
          {user?.isRecurring && (
            <p className={styles.recurringInfo}>
              Recurring: {user?.remainingMonths} months remaining
            </p>
          )}
          
          {user?.subscriptionExpiry && (
            <p className={styles.expiryDate}>
              Expires: {formatDate(user.subscriptionExpiry)}
            </p>
          )}
          
          {user?.nextPaymentDate && (
            <p className={styles.nextPaymentDate}>
              Next Payment: {formatDate(user.nextPaymentDate)}
            </p>
          )}
        </div>
        
        <div className={styles.profileForm}>
          <h3>Update Profile Information</h3>
          
          {message && (
            <div className={message.includes("successfully") ? styles.successMessage : styles.errorMessage}>
              {message}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
              />
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="phoneNumber">Phone Number</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="Enter your phone number"
              />
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="accountNumber">Account Number</label>
              <input
                type="text"
                id="accountNumber"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
                placeholder="Enter your account number"
              />
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="bankName">Bank Name</label> 
              <input
                type="text"
                id="bankName"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                placeholder="Enter your bank name"
              />
            </div>
            
            <button 
              type="submit" 
              className={`${styles.submitBtn} ${loading ? styles.loading : ""}`} 
              disabled={loading}
            >
              <div className={styles.btnContent}>
                <span className={styles.btnText}>Update Profile</span>
                <div className={styles.btnLoader}>
                  <div className={styles.spinner}></div>
                </div>
              </div>
              <i className="fas fa-save"></i>
            </button>
          </form>
          
          <Link to="/device-manager" className={styles.deviceManagerLink}>
            <button className={styles.deviceManagerBtn}>
              <i className="fas fa-mobile-alt"></i>
              Device Manager
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Profile