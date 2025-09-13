"use client"
import { useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import styles from "../../styles/profile.module.css"

const Profile = () => {
  const { user, updateUser } = useAuth()
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    phoneNumber: user?.phoneNumber || "",
    accountNumber: user?.accountNumber || "",
    bankName: user?.bankName || "",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

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
      const response = await axios.put("/api/users/profile", formData)
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

  return (
    <div className={styles.profilePage}>
      <div className={styles.profileContainer}>
        <div className={styles.authHeader}>
          <Link to="/home" className={styles.backBtn}>
            <i className="fas fa-arrow-left"></i>
          </Link>
          <h1 className={styles.appLogo}>SmartDrill</h1>
        </div>
        
        <div className={styles.profileHeader}>
          <div className={styles.profileAvatar}>{getInitials(user?.fullName)}</div>
          <h2>{user?.fullName}</h2>
          <p className={styles.profileEmail}>{user?.email}</p>
          <p className={styles.profileCourse}>{user?.course}</p>
          <div className={user?.isSubscribed ? styles.subscribedBadge : styles.notSubscribedBadge}>
            {user?.isSubscribed ? "Subscribed" : "Not Subscribed"}
          </div>
          {user?.subscriptionExpiry && (
            <p className={styles.expiryDate}>
              Expires: {new Date(user.subscriptionExpiry).toLocaleDateString()}
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