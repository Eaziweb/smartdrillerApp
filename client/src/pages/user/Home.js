"use client"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import usePWAInstall from "../../hooks/usePWAInstall"
import styles from "../../styles/home.module.css"
import AboutSmartDriller from "./AboutSmartDriller"
import SubscriptionModal from "./SubscriptionModal"
import api from "../../utils/api"

const Home = () => {
  const { user, logout, updateUser } = useAuth()

  // ── PWA Install hook ──────────────────────────────────────────────
  const { isInstallable, isInstalled, handleInstall } = usePWAInstall()

  // ── UI state ──────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false)
  const [contactPopupOpen, setContactPopupOpen] = useState(false)
  const [aboutModalOpen, setAboutModalOpen] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)

  // ── Data state ────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // ── Touch state (sidebar swipe-to-close) ─────────────────────────
  const [touchStartX, setTouchStartX] = useState(0)
  const [touchEndX, setTouchEndX] = useState(0)

  // ── Refs ──────────────────────────────────────────────────────────
  const contactPopupRef = useRef(null)
  const sidebarRef = useRef(null)
  const initializedRef = useRef(false)

  // ── Notification icon map ─────────────────────────────────────────
  const getNotificationIcon = useCallback((type) => {
    const iconMap = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
      warning: "fa-exclamation-triangle",
      default: "fa-info-circle",
    }
    return iconMap[type] || iconMap.default
  }, [])

  // ── Feature cards ─────────────────────────────────────────────────
  const featureCards = useMemo(
    () => [
      {
        to: "/course-selection?type=study",
        icon: "fa-solid fa-book-open-reader",
        title: "Study",
        description: "Master concepts with thousands of expertly explained questions.",
      },
      {
        to: "/course-selection?type=mock",
        icon: "fa-solid fa-stopwatch",
        title: "Mock Test",
        description: "Simulate real exams and instantly identify your weaknesses.",
      },
      {
        to: "/bookmarks",
        icon: "fa-solid fa-bookmark",
        title: "Bookmarks",
        description: "Save important questions for faster, smarter exam revisions.",
      },
      {
        to: "/videos",
        icon: "fa-solid fa-video",
        title: "Videos",
        description: "Watch engaging video lessons that simplify difficult concepts.",
      },
      {
        to: "/notes",
        icon: "fa-solid fa-sticky-note",
        title: "Notes",
        description: "Access clear, concise notes tailored for effective studying.",
      },
      {
        to: "/materials",
        icon: "fa-solid fa-file-lines",
        title: "Materials",
        description: "Download study materials for deeper insights and preparation.",
      },
      {
        to: "/results-history",
        icon: "fa-solid fa-chart-line",
        title: "Results History",
        description: "Track progress with detailed reports on past performances.",
      },
      {
        to: "/AI-assistant",
        icon: "fa-solid fa-robot",
        title: "AI Assistant",
        description: "Chat with AI for instant answers and study support.",
      },
      {
        to: "/question-search",
        icon: "fa-solid fa-magnifying-glass",
        title: "Question Search",
        description: "Quickly find questions by topic, keyword, or subject.",
      },
      {
        to: "/competitions",
        icon: "fa-solid fa-trophy",
        title: "Competition",
        description: "Compete with peers and climb leaderboards in real time.",
      },
      {
        to: "/cgpa-calc",
        icon: "fa-solid fa-calculator",
        title: "CGPA",
        description: "Easily calculate your CGPA in just a few simple steps.",
      },
    ],
    []
  )

  // ── Initialization: fetch user + notifications ────────────────────
  useEffect(() => {
    if (initializedRef.current) return

    const initializeData = async () => {
      try {
        const userResponse = await api.get("/api/users/profile")
        const updatedUser = userResponse.data.user
        updateUser(updatedUser)
        await loadNotifications(updatedUser)
      } catch (error) {
        console.error("Initialization error:", error)
        if (user) await loadNotifications(user)
      }
    }

    initializeData()
    initializedRef.current = true

    // Click-outside handler
    const handleClickOutside = (event) => {
      if (
        contactPopupOpen &&
        contactPopupRef.current &&
        !contactPopupRef.current.contains(event.target)
      ) {
        setContactPopupOpen(false)
        return
      }
      if (
        sidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        setSidebarOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [contactPopupOpen, sidebarOpen, updateUser, user])

  // Re-load notifications when user changes
  useEffect(() => {
    if (user && initializedRef.current) loadNotifications(user)
  }, [user])

  // Sync lastNotificationView from localStorage
  useEffect(() => {
    const storedLastView = localStorage.getItem("lastNotificationView")
    if (storedLastView && user) {
      if (
        !user.lastNotificationView ||
        new Date(user.lastNotificationView) < new Date(storedLastView)
      ) {
        updateUser({ ...user, lastNotificationView: storedLastView })
      }
    }
  }, [user, updateUser])

  // ── Data helpers ──────────────────────────────────────────────────
  const loadNotifications = useCallback(async (userData) => {
    try {
      const response = await api.get("/api/notifications")
      setNotifications(response.data)

      if (userData?.lastNotificationView) {
        const lastView = new Date(userData.lastNotificationView)
        const unread = response.data.filter(
          (n) => new Date(n.createdAt) > lastView
        ).length
        setUnreadCount(unread)
      } else {
        setUnreadCount(response.data.length)
      }
    } catch (error) {
      console.error("Failed to load notifications:", error)
    }
  }, [])

  const markNotificationsAsRead = useCallback(async () => {
    try {
      const response = await api.put("/api/users/last-notification-view")
      updateUser(response.data.user)
      setUnreadCount(0)
      localStorage.setItem("lastNotificationView", new Date().toISOString())
    } catch (error) {
      console.error("Failed to mark notifications as read:", error)
    }
  }, [updateUser])

  const isNotificationNew = useCallback(
    (notification) => {
      if (!user?.lastNotificationView) return true
      return new Date(notification.createdAt) > new Date(user.lastNotificationView)
    },
    [user]
  )

  // ── Action handlers ───────────────────────────────────────────────
  const toggleNotificationPanel = useCallback(async () => {
    const isOpening = !notificationPanelOpen
    setNotificationPanelOpen(isOpening)
    if (isOpening) await markNotificationsAsRead()
  }, [notificationPanelOpen, markNotificationsAsRead])

  const handleActivate = useCallback(async () => {
    if (user?.isSubscribed) {
      showMessage("You are already subscribed!", "info")
      return
    }
    setShowSubscriptionModal(true)
  }, [user])

  const initializePayment = useCallback(async (subscriptionType, months) => {
    setLoading(true)
    try {
      const response = await api.post("/api/payments/initialize", {
        subscriptionType,
        months,
      })
      if (response.data.status === "success") {
        window.location.href = response.data.data.link
      } else {
        showMessage("Failed to initialize payment", "error")
      }
    } catch (error) {
      console.error("Payment initialization failed:", error)
      showMessage(
        error.response?.data?.message || "Failed to initialize payment",
        "error"
      )
    } finally {
      setLoading(false)
    }
  }, [])

  const showMessage = useCallback((message, type = "info") => {
    const messageEl = document.createElement("div")
    messageEl.className = `${styles.messageToast} ${styles[type]}`
    messageEl.innerHTML = `
      <i class="fas ${
        type === "success"
          ? "fa-check-circle"
          : type === "error"
          ? "fa-exclamation-triangle"
          : "fa-info-circle"
      }"></i>
      <span>${message}</span>
    `
    document.body.appendChild(messageEl)
    setTimeout(() => {
      messageEl.style.animation = "slideOutRight 0.3s ease forwards"
      setTimeout(() => messageEl.remove(), 300)
    }, 3000)
  }, [])

  // ── PWA install button handler ────────────────────────────────────
  const handleInstallClick = useCallback(async () => {
    const outcome = await handleInstall()
    if (outcome === "accepted") {
      showMessage("SmartDriller installed! 🎉", "success")
    }
    setSidebarOpen(false)
  }, [handleInstall, showMessage])

  // ── Sidebar / misc ────────────────────────────────────────────────
  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), [])
  const toggleContactPopup = useCallback(
    () => setContactPopupOpen((prev) => !prev),
    []
  )
  const toggleAboutModal = useCallback(
    () => setAboutModalOpen((prev) => !prev),
    []
  )
  const handleProfileClick = useCallback((e) => e.stopPropagation(), [])

  // Touch swipe to close sidebar
  const handleTouchStart = useCallback(
    (e) => setTouchStartX(e.touches[0].clientX),
    []
  )
  const handleTouchMove = useCallback(
    (e) => setTouchEndX(e.touches[0].clientX),
    []
  )
  const handleTouchEnd = useCallback(() => {
    if (touchStartX - touchEndX > 75) setSidebarOpen(false)
  }, [touchStartX, touchEndX])

  // Share
  const handleShare = useCallback(async () => {
    const fullText = `🎓 Unlock Your Academic Potential with SmartDriller! 🚀

Join thousands of first-year university students mastering their courses with our premium learning platform.

✨ PREMIUM FEATURES:
• Study Mode with unlimited practice questions
• Mock Tests with detailed analytics & insights
• Bookmark important questions for quick revision
• Comprehensive video lessons & study notes
• AI-powered study assistant for instant help
• Progress tracking & results history
• Access to all courses and academic years

🌟 Transform your learning experience and ace your exams with SmartDriller!

Join now: https://smartdriller.vercel.app/`

    const shareData = {
      title: "SmartDriller - Your Ultimate Study Companion",
      text: fullText,
      url: "https://smartdriller.vercel.app/",
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        showMessage("Shared successfully!", "success")
      } else {
        await navigator.clipboard.writeText(fullText)
        showMessage("Copied to clipboard!", "success")
      }
    } catch {
      try {
        await navigator.clipboard.writeText(fullText)
        showMessage("Copied to clipboard!", "success")
      } catch {
        showMessage("Failed to share", "error")
      }
    }
  }, [showMessage])

  // WhatsApp channel
  const openWhatsAppChannel = useCallback((event) => {
    event.preventDefault()
    const channelId = "0029VbBLtIyKbYMQYmgnDh2o"
    window.location.href = `https://wa.me/channel/${channelId}`
    setTimeout(() => {
      window.open(`https://whatsapp.com/channel/${channelId}`, "_blank")
    }, 800)
  }, [])

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className={styles.homePage}>
      {/* Loading overlay */}
      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}></div>
        </div>
      )}

      {/* Dim overlay behind sidebar / panels */}
      <div
        className={`${styles.overlay} ${
          sidebarOpen || notificationPanelOpen || aboutModalOpen
            ? styles.active
            : ""
        }`}
        onClick={(e) => {
          if (!contactPopupRef.current?.contains(e.target)) {
            setSidebarOpen(false)
            setNotificationPanelOpen(false)
            setAboutModalOpen(false)
          }
        }}
      />

      {/* ── Navbar ── */}
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
          <button
            className={`${styles.iconBtn} ${styles.navContactIcon}`}
            onClick={toggleContactPopup}
          >
            <i className="fas fa-question-circle"></i>
          </button>
          <button
            className={`${styles.iconBtn} ${styles.notificationBtn}`}
            onClick={toggleNotificationPanel}
          >
            <i className="fas fa-bell"></i>
            {unreadCount > 0 && (
              <span className={`${styles.notificationBadge} ${styles.active}`}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* ── Sidebar ── */}
      <div
        ref={sidebarRef}
        className={`${styles.sidebar} ${sidebarOpen ? styles.active : ""}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.sidebarHeader}>
          <div className={styles.userProfile}>
            <Link
              to="/profile"
              style={{ textDecoration: "none", color: "white" }}
              onClick={handleProfileClick}
            >
              <div className={styles.profileContainer}>
                <i className={`fas fa-user-circle ${styles.profileIcon}`}></i>
                <h2 className={styles.profileName}>{user?.fullName || "User"}</h2>
                <i className={`fas fa-chevron-right ${styles.profileArrow}`}></i>
              </div>
            </Link>
          </div>
          <button
            className={styles.closeBtn}
            onClick={(e) => {
              e.stopPropagation()
              setSidebarOpen(false)
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className={styles.sidebarContent}>
          {/* Quick Access */}
          <div className={styles.sidebarSection}>
            <h3>Quick Access</h3>
            <ul>
              {/* PWA Install button — only visible when browser supports it
                  and app is not yet installed */}
              {isInstallable && !isInstalled && (
                <li>
                  <button
                    onClick={handleInstallClick}
                    className={styles.sidebarItem}
                  >
                    <i className="fas fa-download"></i> Install App
                  </button>
                </li>
              )}

              <li>
                <button onClick={handleActivate} className={styles.sidebarItem}>
                  <i className="fas fa-plus-circle"></i> Activate
                </button>
              </li>
              <li>
                <Link to="/competition-history" className={styles.sidebarItem}>
                  <i className="fas fa-trophy"></i> Leaderboard
                </Link>
              </li>
              <li>
                <Link to="/bookmarks" className={styles.sidebarItem}>
                  <i className="fas fa-bookmark"></i> Bookmarks
                </Link>
              </li>
            </ul>
          </div>

          {/* Community & Contact */}
          <div className={styles.sidebarSection}>
            <h3>Community &amp; Contact</h3>
            <ul>
              <li>
                <button
                  onClick={openWhatsAppChannel}
                  className={styles.sidebarItem}
                >
                  <i className="fas fa-thumbs-up"></i> Follow us on WhatsApp
                </button>
              </li>
              <li>
                <button onClick={handleShare} className={styles.sidebarItem}>
                  <i className="fas fa-share-alt"></i> Share
                </button>
              </li>
              <li>
                <button
                  onClick={toggleAboutModal}
                  className={styles.sidebarItem}
                >
                  <i className="fas fa-info-circle"></i> About SmartDriller
                </button>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div className={styles.sidebarSection}>
            <h3>Account</h3>
            <ul>
              <li>
                <button onClick={logout} className={styles.sidebarItem}>
                  <i className="fas fa-sign-out-alt"></i> Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Notification Panel ── */}
      <div
        className={`${styles.notificationPanel} ${
          notificationPanelOpen ? styles.active : ""
        }`}
      >
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
                className={`${styles.notificationItem} ${
                  styles[
                    `type${
                      notification.type.charAt(0).toUpperCase() +
                      notification.type.slice(1)
                    }`
                  ]
                } ${
                  isNotificationNew(notification) ? styles.newNotification : ""
                }`}
              >
                <div
                  className={`${styles.notificationIcon} ${
                    styles[
                      `icon${
                        notification.type.charAt(0).toUpperCase() +
                        notification.type.slice(1)
                      }`
                    ]
                  }`}
                >
                  <i
                    className={`fas ${getNotificationIcon(notification.type)}`}
                  ></i>
                </div>
                <div className={styles.notificationText}>
                  <h3>{notification.title}</h3>
                  <p
                    dangerouslySetInnerHTML={{
                      __html: notification.message.replace(
                        /(https?:\/\/[^\s]+)/g,
                        '<a href="$1" target="_blank" rel="noopener noreferrer" class="wrap-link">$1</a>'
                      ),
                    }}
                  />
                  <div className={styles.notificationTime}>
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Contact popup ── */}
      <div
        ref={contactPopupRef}
        className={`${styles.contactPopUp} ${
          contactPopupOpen ? styles.showContact : ""
        }`}
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

      {/* ── Main feature grid ── */}
      <main className={styles.main}>
        <div className={styles.featureGrid}>
          {featureCards.map((card, index) => (
            <Link to={card.to} key={index} className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <i className={card.icon}></i>
              </div>
              <div className={styles.featureText}>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* ── Bottom Activate button ── */}
      <div className={styles.bottom}>
        <button
          className={`${styles.activateBtn} ${
            user?.isSubscribed ? styles.subscribed : ""
          }`}
          onClick={handleActivate}
          disabled={loading}
        >
          <span className={styles.btnText}>
            {loading
              ? "Processing..."
              : user?.isSubscribed
              ? "SUBSCRIBED"
              : "ACTIVATE"}
          </span>
        </button>
      </div>

      {/* ── Modals ── */}
      <AboutSmartDriller isOpen={aboutModalOpen} onClose={toggleAboutModal} />

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        user={user}
        onSubscribe={initializePayment}
        loading={loading}
      />
    </div>
  )
}

export default Home
