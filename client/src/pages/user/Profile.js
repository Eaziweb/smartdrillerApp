"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import api from "../../utils/api"
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
  const [paymentHistory, setPaymentHistory] = useState([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [retryingPayment, setRetryingPayment] = useState(false)
  const [retryMessage, setRetryMessage] = useState("")

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        phoneNumber: user.phoneNumber || "",
        accountNumber: user.accountNumber || "",
        bankName: user.bankName || "",
      })

      if (user.university) {
        if (typeof user.university === "object" && user.university.name) {
          setUniversityName(user.university.name)
        } else if (typeof user.university === "string") {
          setUniversityName(user.university)
        }
      } else {
        setUniversityName("University not set")
      }

      if (user.course) {
        if (typeof user.course === "object" && user.course.name) {
          setCourseName(user.course.name)
          setLoadingCourse(false)
        } else if (typeof user.course === "string") {
          setCourseName(user.course)
          setLoadingCourse(false)
        } else {
          fetchCourseName(user.course)
        }
      } else {
        setCourseName("Course not set")
        setLoadingCourse(false)
      }

      loadPaymentHistory()
    }
  }, [user])

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

  const loadPaymentHistory = async () => {
    setLoadingPayments(true)
    try {
      const response = await api.get("/api/payments/history")
      setPaymentHistory(response.data.payments || [])
    } catch (error) {
      console.error("Failed to load payment history:", error)
    } finally {
      setLoadingPayments(false)
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

  const handleRetryPayment = async (paymentId) => {
    setRetryingPayment(true)
    setRetryMessage("")

    try {
      const response = await api.post(`/api/payments/retry-verification/${paymentId}`)

      if (response.data.success) {
        updateUser(response.data.user)
        setRetryMessage("Payment verification successful! Your subscription has been activated.")
        loadPaymentHistory()
      } else {
        setRetryMessage(response.data.message || "Payment verification failed. Please try again.")
      }
    } catch (error) {
      console.error("Payment retry error:", error)
      setRetryMessage(error.response?.data?.message || "Failed to verify payment. Please try again.")
    } finally {
      setRetryingPayment(false)
    }
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
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatDateTime = (date) => {
    if (!date) return ""
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getSubscriptionInfo = () => {
    if (!user?.subscriptionExpiry) {
      return { duration: "Not Subscribed", expiry: null }
    }

    const expiryDate = new Date(user.subscriptionExpiry)
    const now = new Date()
    const diffTime = expiryDate - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      return { duration: "Expired", expiry: expiryDate }
    }

    if (user.subscriptionType === "monthly") {
      const startDate = user.subscriptionStartDate ? new Date(user.subscriptionStartDate) : now
      const totalDays = Math.ceil((expiryDate - startDate) / (1000 * 60 * 60 * 24))
      const monthsPurchased = Math.ceil(totalDays / 30)

      return {
        duration: `${monthsPurchased} month${monthsPurchased > 1 ? "s" : ""} plan`,
        expiry: expiryDate,
      }
    } else {
      return {
        duration: "Semester plan",
        expiry: expiryDate,
      }
    }
  }

  const hasRetryablePayment = () => {
    if (!paymentHistory.length) return false

    const retryablePayment = paymentHistory.find(
      (payment) => payment.status === "pending" || (payment.status === "failed" && !payment.subscriptionExpiry),
    )

    return !!retryablePayment
  }

  const getRetryablePayment = () => {
    return paymentHistory.find(
      (payment) => payment.status === "pending" || (payment.status === "failed" && !payment.subscriptionExpiry),
    )
  }

  const subscriptionInfo = getSubscriptionInfo()

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
          <p className={styles.profileEmail}>
            <i className="fas fa-envelope"></i>
            {user?.email}
          </p>
          <p className={styles.profileCourse}>
            <i className="fas fa-book"></i>
            {loadingCourse ? "Loading course..." : courseName}
          </p>
          <p className={styles.profileUniversity}>
            <i className="fas fa-university"></i>
            {universityName}
          </p>
          <div className={user?.isSubscribed ? styles.subscribedBadge : styles.notSubscribedBadge}>
            <i className={`fas ${user?.isSubscribed ? "fa-check-circle" : "fa-times-circle"}`}></i>
            {user?.isSubscribed ? "Subscribed" : "Not Subscribed"}
          </div>

          <div className={styles.subscriptionInfo}>
            <p className={styles.subscriptionType}>
              <i className="fas fa-credit-card"></i>
              Plan: {subscriptionInfo.duration}
            </p>
            {user?.subscriptionExpiry && (
              <p className={styles.expiryDate}>
                <i className="fas fa-hourglass-half"></i>
                Expires: {formatDateTime(user.subscriptionExpiry)}
              </p>
            )}
          </div>
        </div>

        <div className={styles.profileForm}>
          <h3>Update Profile Information</h3>

          {message && (
            <div className={message.includes("successfully") ? styles.successMessage : styles.errorMessage}>
              <i className={`fas ${message.includes("successfully") ? "fa-check-circle" : "fa-times-circle"}`}></i>
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

            <button type="submit" className={`${styles.submitBtn} ${loading ? styles.loading : ""}`} disabled={loading}>
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

        <div className={styles.paymentHistorySection}>
          <h3>Payment History</h3>

          {retryMessage && (
            <div className={retryMessage.includes("successful") ? styles.successMessage : styles.errorMessage}>
              <i className={`fas ${retryMessage.includes("successful") ? "fa-check-circle" : "fa-times-circle"}`}></i>
              {retryMessage}
            </div>
          )}

          {loadingPayments ? (
            <div className={styles.loadingPayments}>
              <div className={styles.spinnerSmall}></div>
              <p>Loading payment history...</p>
            </div>
          ) : paymentHistory.length > 0 ? (
            <div className={styles.paymentsList}>
              {paymentHistory.map((payment) => (
                <div key={payment._id} className={styles.paymentItem}>
                  <div className={styles.paymentInfo}>
                    <div className={styles.paymentDetails}>
                      <span className={styles.paymentType}>
                        {payment.subscriptionType === "monthly" ? "Monthly" : "Semester"} Plan
                        {payment.meta?.months && payment.subscriptionType === "monthly" && (
                          <span>
                            {" "}
                            ({payment.meta.months} month{payment.meta.months > 1 ? "s" : ""})
                          </span>
                        )}
                      </span>
                      <span className={styles.paymentAmount}>₦{payment.amount}</span>
                      <span className={styles.paymentDate}>{formatDate(payment.createdAt)}</span>
                    </div>
                    <div className={styles.paymentStatus}>
                      <span className={`${styles.statusBadge} ${styles[payment.status]}`}>
                        {payment.status === "successful"
                          ? "Successful"
                          : payment.status === "pending"
                            ? "Pending"
                            : "Failed"}
                      </span>
                      {payment.subscriptionExpiry && (
                        <span className={styles.paymentExpiry}>
                          Expires: {formatDateTime(payment.subscriptionExpiry)}
                        </span>
                      )}
                    </div>
                  </div>

                  {(payment.status === "pending" || (payment.status === "failed" && !payment.subscriptionExpiry)) && (
                    <button
                      className={styles.retryBtn}
                      onClick={() => handleRetryPayment(payment._id)}
                      disabled={retryingPayment}
                    >
                      {retryingPayment ? "Retrying..." : "Retry Verification"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noPayments}>
              <i className="fas fa-credit-card"></i>
              <p>No payment history found</p>
            </div>
          )}

          {hasRetryablePayment() && (
            <div className={styles.retrySection}>
              <h4>Having trouble with your payment?</h4>
              <p>If you made a payment but it's not showing as active, you can retry the verification process.</p>
              <button
                className={styles.globalRetryBtn}
                onClick={() => handleRetryPayment(getRetryablePayment()._id)}
                disabled={retryingPayment}
              >
                <i className="fas fa-sync-alt"></i>
                {retryingPayment ? "Retrying Verification..." : "Retry Payment Verification"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile
