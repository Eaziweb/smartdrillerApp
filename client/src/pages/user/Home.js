"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import styles from "../../styles/home.module.css"
import AboutSmartDriller from "./AboutSmartDriller"
import SubscriptionModal from "./SubscriptionModal"

const Home = () => {
  const { user, logout, updateUser } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false)
  const [contactPopupOpen, setContactPopupOpen] = useState(false)
  const [aboutModalOpen, setAboutModalOpen] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    loadNotifications()
  }, [user])
  
  const loadNotifications = async () => {
    try {
      const response = await axios.get("/api/notifications")
      setNotifications(response.data)
      
      // Calculate unread notifications (notifications created after user's last view)
      if (user?.lastNotificationView) {
        const lastView = new Date(user.lastNotificationView)
        const unread = response.data.filter(
          notif => new Date(notif.createdAt) > lastView
        ).length
        setUnreadCount(unread)
      } else {
        // If user has never viewed notifications, all are unread
        setUnreadCount(response.data.length)
      }
    } catch (error) {
      console.error("Failed to load notifications:", error)
    }
  }
  
  const markNotificationsAsRead = async () => {
    try {
      // Update user's last notification view time
      await axios.put("/api/users/last-notification-view")
      
      // Update user in context
      updateUser({
        ...user,
        lastNotificationView: new Date()
      })
      
      // Reset unread count
      setUnreadCount(0)
    } catch (error) {
      console.error("Failed to mark notifications as read:", error)
    }
  }
  
  const toggleNotificationPanel = async () => {
    const isOpening = !notificationPanelOpen
    setNotificationPanelOpen(isOpening)
    
    // If opening the panel, mark notifications as read
    if (isOpening) {
      await markNotificationsAsRead()
    }
  }
  
  const handleActivate = async () => {
    if (user?.isSubscribed) {
      showMessage("You are already subscribed!", "info")
      return
    }
    
    // Check if user's university has semester plan available
    try {
      const response = await axios.get("/api/payments/subscription-options")
      const { semester } = response.data.options
      
      if (semester) {
        // Show subscription modal if semester is available
        setShowSubscriptionModal(true)
      } else {
        // Directly initialize monthly payment
        initializePayment("monthly", false, 1)
      }
    } catch (error) {
      console.error("Failed to check subscription options:", error)
      showMessage("Failed to check subscription options", "error")
    }
  }
  
  const initializePayment = async (subscriptionType, isRecurring, recurringMonths) => {
    setLoading(true)
    try {
      const response = await axios.post("/api/payments/initialize", {
        subscriptionType,
        isRecurring,
        recurringMonths,
      })
      
      if (response.data.status === "success") {
        // Redirect to Flutterwave payment link
        window.location.href = response.data.data.link
      } else {
        showMessage("Failed to initialize payment", "error")
      }
    } catch (error) {
      console.error("Payment initialization failed:", error)
      showMessage(error.response?.data?.message || "Failed to initialize payment", "error")
    } finally {
      setLoading(false)
    }
  }
  
  const showMessage = (message, type = "info") => {
    const messageEl = document.createElement("div")
    messageEl.className = `${styles.messageToast} ${styles[type]}`
    messageEl.innerHTML = `
      <i className="fas ${type === "success" ? "fa-check-circle" : type === "error" ? "fa-exclamation-triangle" : "fa-info-circle"}"></i>
      <span>${message}</span>
    `
    document.body.appendChild(messageEl)
    setTimeout(() => {
      messageEl.style.animation = "slideOutRight 0.3s ease forwards"
      setTimeout(() => messageEl.remove(), 300)
    }, 3000)
  }
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }
  
  const toggleContactPopup = () => {
    setContactPopupOpen(!contactPopupOpen)
  }
  
  const toggleAboutModal = () => {
    setAboutModalOpen(!aboutModalOpen)
  }
  
  // Function to get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case "success":
        return "fa-check-circle"
      case "error":
        return "fa-exclamation-circle"
      case "warning":
        return "fa-exclamation-triangle"
      default:
        return "fa-info-circle"
    }
  }
  
  // Function to check if notification is new (unread)
  const isNotificationNew = (notification) => {
    if (!user?.lastNotificationView) return true
    return new Date(notification.createdAt) > new Date(user.lastNotificationView)
  }
  
  return (
    <div className={styles.homePage}>
      {/* Overlay */}
      <div
        className={`${styles.overlay} ${sidebarOpen || notificationPanelOpen || aboutModalOpen ? styles.active : ""}`}
        onClick={() => {
          setSidebarOpen(false)
          setNotificationPanelOpen(false)
          setContactPopupOpen(false)
          setAboutModalOpen(false)
        }}
      ></div>
      
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navLeft}>
          <button className={styles.menuBtn} onClick={toggleSidebar}>
            <i className="fas fa-bars"></i>
          </button>
          <h1 className={styles.appLogo}>SmartDriller</h1>
        </div>
        <div className={styles.navRight}>
          <Link to="/AI-assistant">
            <button className={`${styles.iconBtn} ${styles.aiIcon}`}>
              <i className="fas fa-robot"></i>
            </button>
          </Link>
          <button className={`${styles.iconBtn} ${styles.navContactIcon}`} onClick={toggleContactPopup}>
            <i className="fas fa-question-circle"></i>
          </button>
          <button className={`${styles.iconBtn} ${styles.notificationBtn}`} onClick={toggleNotificationPanel}>
            <i className="fas fa-bell"></i>
            {unreadCount > 0 && (
              <span className={`${styles.notificationBadge} ${styles.active}`}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </nav>
      
      {/* Sidebar */}
      <div className={`${styles.sidebar} ${sidebarOpen ? styles.active : ""}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.userProfile}>
            <Link to="/profile" style={{ textDecoration: "none", color: "white" }}>
              <h2 className={styles.profileName}>{user?.fullName || "User"}</h2>
            </Link>
          </div>
          <button className={styles.closeBtn} onClick={toggleSidebar}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className={styles.sidebarContent}>
          {/* --- Quick Access --- */}
          <div className={styles.sidebarSection}>
            <h3>Quick Access</h3>
            <ul>
              <li>
                <a href="#" onClick={handleActivate}>
                  <i className="fas fa-plus-circle"></i> Activate
                </a>
              </li>
              <li>
                <Link to="/competition-history">
                  <i className="fas fa-trophy"></i> Leaderboard
                </Link>
              </li>
              <li>
                <Link to="/bookmarks">
                  <i className="fas fa-bookmark"></i> Bookmarks
                </Link>
              </li>
            </ul>
          </div>
          {/* --- Community & Contact --- */}
          <div className={styles.sidebarSection}>
            <h3>Community & Contact</h3>
            <ul>
              <li>
                <a href="https://whatsapp.com/channel/0029VbAS8umBadma5VAxix2R" target="_blank" rel="noopener noreferrer">
                  <i className="fas fa-thumbs-up"></i> Follow us on WhatsApp
                </a>
              </li>
              <li>
                <a href="#">
                  <i className="fas fa-share-alt"></i> Share
                </a>
              </li>
              <li>
                <Link to="#" onClick={toggleAboutModal}>
                  <i className="fas fa-info-circle"></i> About SmartDriller
                </Link>
              </li>
            </ul>
          </div>
          {/* --- Account --- */}
          <div className={styles.sidebarSection}>
            <h3>Account</h3>
            <ul>
              <li>
                <Link to="#" onClick={logout}>
                  <i className="fas fa-sign-out-alt"></i> Logout
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Notification Panel */}
      <div className={`${styles.notificationPanel} ${notificationPanelOpen ? styles.active : ""}`}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={toggleNotificationPanel}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2>Notifications</h2>
          <button className={styles.deleteAllBtn}>Clear</button>
        </div>
        <div className={styles.notificationContent}>
          {notifications.length === 0 ? (
            <div className={styles.emptyNotification}>
              <i className="fas fa-bell-slash"></i>
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification._id} 
                className={`${styles.notificationItem} ${styles[`type${notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}`]} ${isNotificationNew(notification) ? styles.newNotification : ''}`}
              >
                <div className={`${styles.notificationIcon} ${styles[`icon${notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}`]}`}>
                  <i className={`fas ${getNotificationIcon(notification.type)}`}></i>
                </div>
                <div className={styles.notificationText}>
                  <h3>{notification.title}</h3>
                  <p>{notification.message}</p>
                  <div className={styles.notificationTime}>
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Contact Popup */}
      <div className={`${styles.contactPopUp} ${contactPopupOpen ? styles.showContact : ""}`}>
        <div className={`${styles.contact} ${styles.contact1}`}>
          <div className={styles.contactIcon}>WhatsApp</div>
          <a href="tel:+2348103414050" className={styles.contactNo}>
            +2348103414050
          </a>
        </div>
        <div className={`${styles.contact} ${styles.contact2}`}>
          <div className={styles.contactIcon}>Email</div>
          <a href="mailto:support@smartdriller.com" className={styles.contactNo}>
            support@smartdriller.com
          </a>
        </div>
      </div>
      
      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.featureGrid}>
          <Link to="/course-selection?type=study" className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <i className="fa-solid fa-book-open-reader"></i>
            </div>
            <div className={styles.featureText}>
              <h3>Study</h3>
              <p>Master concepts with thousands of expertly explained questions.</p>
            </div>
          </Link>
          <Link to="/course-selection?type=mock" className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <i className="fa-solid fa-stopwatch"></i>
            </div>
            <div className={styles.featureText}>
              <h3>Mock Test</h3>
              <p>Simulate real exams and instantly identify your weaknesses.</p>
            </div>
          </Link>
          <Link to="/bookmarks" className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <i className="fa-solid fa-bookmark"></i>
            </div>
            <div className={styles.featureText}>
              <h3>Bookmarks</h3>
              <p>Save important questions for faster, smarter exam revisions.</p>
            </div>
          </Link>
          <Link to="/results-history" className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <i className="fa-solid fa-chart-line"></i>
            </div>
            <div className={styles.featureText}>
              <h3>Results History</h3>
              <p>Track progress with detailed reports on past performances.</p>
            </div>
          </Link>
          <Link to="/notes" className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <i className="fa-solid fa-sticky-note"></i>
            </div>
            <div className={styles.featureText}>
              <h3>Notes</h3>
              <p>Access clear, concise notes tailored for effective studying.</p>
            </div>
          </Link>
          <Link to="/videos" className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <i className="fa-solid fa-video"></i>
            </div>
            <div className={styles.featureText}>
              <h3>Videos</h3>
              <p>Watch engaging video lessons that simplify difficult concepts.</p>
            </div>
          </Link>
          <Link to="/materials" className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <i className="fa-solid fa-file-lines"></i>
            </div>
            <div className={styles.featureText}>
              <h3>Materials</h3>
              <p>Download study materials for deeper insights and preparation.</p>
            </div>
          </Link>
          <Link to="/AI-assistant" className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <i className="fa-solid fa-robot"></i>
            </div>
            <div className={styles.featureText}>
              <h3>AI Assistant</h3>
              <p>Chat with AI for instant answers and study support.</p>
            </div>
          </Link>
          <Link to="/question-search" className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <i className="fa-solid fa-magnifying-glass"></i>
            </div>
            <div className={styles.featureText}>
              <h3>Question Search</h3>
              <p>Quickly find questions by topic, keyword, or subject.</p>
            </div>
          </Link>
          <Link to="/competitions" className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <i className="fa-solid fa-trophy"></i>
            </div>
            <div className={styles.featureText}>
              <h3>Competition</h3>
              <p>Compete with peers and climb leaderboards in real time.</p>
            </div>
          </Link>
        </div>
      </main>
      
      {/* Bottom Section */}
      <div className={styles.bottom}>
        <button
          className={`${styles.activateBtn} ${user?.isSubscribed ? styles.subscribed : ""}`}
          onClick={handleActivate}
          disabled={loading}
        >
          <span className={styles.btnText}>
            {loading ? "Processing..." : user?.isSubscribed ? "SUBSCRIBED" : "ACTIVATE"}
          </span>
        </button>
        <div className={styles.admin}>
          <i className="fas fa-headset"></i>
        </div>
      </div>
      
      {/* About SmartDriller Modal */}
      <AboutSmartDriller 
        isOpen={aboutModalOpen} 
        onClose={toggleAboutModal} 
      />
      
      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        user={user}
      />
    </div>
  )
}

export default Home