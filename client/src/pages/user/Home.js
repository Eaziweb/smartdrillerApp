"use client"
import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/home.module.css"
import AboutSmartDriller from "./AboutSmartDriller"
import SubscriptionModal from "./SubscriptionModal"
import api from "../../utils/api";

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
  const [touchStartX, setTouchStartX] = useState(0)
  const [touchEndX, setTouchEndX] = useState(0)
  const contactPopupRef = useRef(null)
  const sidebarRef = useRef(null)
  
  useEffect(() => {
    loadNotifications()
    
    // Close contact popup when clicking outside
    const handleClickOutside = (event) => {
      // Handle contact popup
      if (contactPopupOpen && contactPopupRef.current && !contactPopupRef.current.contains(event.target)) {
        setContactPopupOpen(false)
        return; // Prevent further processing
      }
      
      // Handle sidebar close when clicking outside
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setSidebarOpen(false)
        return; // Prevent further processing
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [user, contactPopupOpen, sidebarOpen])
  
  const loadNotifications = async () => {
    try {
      const response = await api.get("/api/notifications")
      setNotifications(response.data)
      
      // Calculate unread notifications
      if (user?.lastNotificationView) {
        const lastView = new Date(user.lastNotificationView)
        const unread = response.data.filter(
          notif => new Date(notif.createdAt) > lastView
        ).length
        setUnreadCount(unread)
      } else {
        setUnreadCount(response.data.length)
      }
    } catch (error) {
      console.error("Failed to load notifications:", error)
    }
  }
  
  const markNotificationsAsRead = async () => {
    try {
      await api.put("/api/users/last-notification-view")
      
      updateUser({
        ...user,
        lastNotificationView: new Date()
      })
      
      setUnreadCount(0)
    } catch (error) {
      console.error("Failed to mark notifications as read:", error)
    }
  }
  
  const toggleNotificationPanel = async () => {
    const isOpening = !notificationPanelOpen
    setNotificationPanelOpen(isOpening)
    
    if (isOpening) {
      await markNotificationsAsRead()
    }
  }
  
  const handleActivate = async () => {
    if (user?.isSubscribed) {
      showMessage("You are already subscribed!", "info")
      return
    }
    
    try {
      const response = await api.get("/api/payments/subscription-options")
      const { semester } = response.data.options
      
      if (semester) {
        setShowSubscriptionModal(true)
      } else {
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
      const response = await api.post("/api/payments/initialize", {
        subscriptionType,
        isRecurring,
        recurringMonths,
      })
      
      if (response.data.status === "success") {
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
  
  // Touch handlers for swipe gestures
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX)
  }
  
  const handleTouchMove = (e) => {
    setTouchEndX(e.touches[0].clientX)
  }
  
  const handleTouchEnd = () => {
    if (touchStartX - touchEndX > 75) { // Swipe left to right
      setSidebarOpen(false)
    }
  }
  
  const handleShare = async () => {
    const shareData = {
      title: 'SmartDriller',
      text: 'Join SmartDriller, an educational website for first year university students!',
      url: 'https://smartdriller-mtvvrdqkt-fayeye1ezekiel1-gmailcoms-projects.vercel.app'
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        showMessage('Link copied to clipboard!', 'success');
      }
    } catch (err) {
      console.error('Error sharing:', err);
      showMessage('Failed to share', 'error');
    }
  }
  
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
  
  const isNotificationNew = (notification) => {
    if (!user?.lastNotificationView) return true
    return new Date(notification.createdAt) > new Date(user.lastNotificationView)
  }
  
  return (
    <div className={styles.homePage}>
      {/* Loading Overlay */}
      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}></div>
        </div>
      )}
      
      {/* Overlay */}
      <div
        className={`${styles.overlay} ${sidebarOpen || notificationPanelOpen || aboutModalOpen ? styles.active : ""}`}
        onClick={(e) => {
          // Only close overlays if not clicking on a contact popup link
          if (!contactPopupRef.current?.contains(e.target)) {
            setSidebarOpen(false)
            setNotificationPanelOpen(false)
            setAboutModalOpen(false)
          }
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
      <div 
        ref={sidebarRef}
        className={`${styles.sidebar} ${sidebarOpen ? styles.active : ""}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.sidebarHeader}>
          <div className={styles.userProfile}>
            <Link to="/profile" style={{ textDecoration: "none", color: "white" }}>
              <div className={styles.profileContainer}>
                <i className={`fas fa-user-circle ${styles.profileIcon}`}></i>
                <h2 className={styles.profileName}>{user?.fullName || "User"}</h2>
                <i className={`fas fa-chevron-right ${styles.profileArrow}`}></i>
              </div>
            </Link>
          </div>
          <button className={styles.closeBtn} onClick={(e) => {
            e.stopPropagation(); // Prevent event from bubbling up
            setSidebarOpen(false)
          }}>
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
                <a href="#" onClick={handleShare}>
                  <i className="fas fa-share-alt"></i> Share
                </a>
              </li>
              <li>
                <a href="#" onClick={toggleAboutModal}>
                  <i className="fas fa-info-circle"></i> About SmartDriller
                </a>
              </li>
            </ul>
          </div>
          {/* --- Account --- */}
          <div className={styles.sidebarSection}>
            <h3>Account</h3>
            <ul>
              <li>
                <a href="#" onClick={logout}>
                  <i className="fas fa-sign-out-alt"></i> Logout
                </a>
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
      <div 
        ref={contactPopupRef}
        className={`${styles.contactPopUp} ${contactPopupOpen ? styles.showContact : ""}`}
      >
        <div className={`${styles.contact} ${styles.contact1}`}>
          <div className={styles.contactIcon}>WhatsApp</div>
          <a href="tel:+2348103414050" className={styles.contactNo}>
            +2348103414050
          </a>
        </div>
        <div className={`${styles.contact} ${styles.contact2}`}>
          <div className={styles.contactIcon}>Email</div>
          <a href="mailto:smartdrillerhelp@gmail.com" className={styles.contactNo}>
            smartdrillerhelp@gmail.com
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