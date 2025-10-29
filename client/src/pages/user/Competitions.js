"use client"
import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/Competitions.module.css"
import api from "../../utils/api"

const Competitions = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [competitions, setCompetitions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    fetchCompetitions()
  }, [])

  const fetchCompetitions = async () => {
    try {
      const response = await api.get("/api/competitions")
      setCompetitions(response.data)
    } catch (error) {
      console.error("Error fetching competitions:", error)
      showMessage("Failed to fetch competitions", "error")
    } finally {
      setLoading(false)
    }
  }

  const filteredCompetitions = competitions.filter((competition) => {
    if (filter === "all") return true
    return competition.status === filter
  })

  const getStatusBadge = (status) => {
    const statusClasses = {
      upcoming: styles.statusUpcoming,
      active: styles.statusActive,
      ended: styles.statusEnded,
    }
    const statusIcons = {
      upcoming: "fa-clock",
      active: "fa-play-circle",
      ended: "fa-check-circle",
    }
    return (
      <span className={`${styles.statusBadge} ${statusClasses[status]}`}>
        <i className={`fas ${statusIcons[status]}`}></i>
        {status.toUpperCase()}
      </span>
    )
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const getFormattedDate = (dateString) => {
    // Format date for sharing (without time)
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getTimeRemaining = (endDate) => {
    const now = new Date()
    const end = new Date(endDate)
    const diff = end - now
    if (diff <= 0) return "Ended"
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (days > 0) return `${days}d ${hours}h remaining`
    if (hours > 0) return `${hours}h ${minutes}m remaining`
    return `${minutes}m remaining`
  }

  const handleCompetitionClick = (competition) => {
    if (competition.status === "active") {
      navigate(`/competitions/${competition._id}`)
    } else if (competition.status === "ended") {
      navigate(`/competitions/${competition._id}/leaderboard`)
    } else {
      navigate(`/competitions/${competition._id}`)
    }
  }

  const handleShareCompetition = (competition, e) => {
    e.stopPropagation()
    
    // Generate beautiful share text
    const statusText = competition.status.charAt(0).toUpperCase() + competition.status.slice(1)
    const startDate = getFormattedDate(competition.startDate)
    const endDate = getFormattedDate(competition.endDate)
    
    const shareText = `🏆 *${competition.name}*\n\n${competition.description}\n\n📅 *Dates:* ${startDate} - ${endDate}\n📊 *Status:* ${statusText}\n\nJoin this exciting academic competition and test your knowledge!`
    
    // Add platform-specific link
    const competitionUrl = `https://smartdriller.vercel.app`
    const fullShareText = `${shareText}\n\n${competitionUrl}`
    
    // Try to use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: competition.name,
        text: shareText,
        url: competitionUrl
      })
      .catch(err => console.log('Error sharing:', err))
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(fullShareText)
        .then(() => {
          showMessage("Competition details copied to clipboard!", "success")
        })
        .catch(err => {
          console.error('Failed to copy: ', err)
          showMessage("Failed to copy competition details", "error")
        })
    }
  }

  const showMessage = (message, type = "info") => {
    const messageEl = document.createElement("div")
    messageEl.className = `message-toast ${type}`
    messageEl.innerHTML = `
      <i class="fas ${type === "success" ? "fa-check-circle" : type === "error" ? "fa-exclamation-triangle" : "fa-info-circle"}"></i>
      <span>${message}</span>
    `
    document.body.appendChild(messageEl)
    setTimeout(() => {
      messageEl.style.animation = "slideOutRight 0.3s ease forwards"
      setTimeout(() => messageEl.remove(), 300)
    }, 3000)
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading competitions...</p>
      </div>
    )
  }

  return (
    <div className={styles.competitionsPage}>
      <div className={styles.pageHeader}>
        <Link to="/home" className={styles.backBtn}>
          <i className="fas fa-arrow-left"></i>
        </Link>
        <div className={styles.headerContent}>
          <h1>Competitions</h1>
          <p>Participate in exciting academic competitions</p>
        </div>
      </div>
      
      <div className={styles.competitionsFilters}>
        <button 
          className={`${styles.filterBtn} ${filter === "all" ? styles.active : ""}`} 
          onClick={() => setFilter("all")}
        >
          All Competitions
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === "upcoming" ? styles.active : ""}`} 
          onClick={() => setFilter("upcoming")}
        >
          <i className="fas fa-clock"></i>
          Upcoming
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === "active" ? styles.active : ""}`} 
          onClick={() => setFilter("active")}
        >
          <i className="fas fa-play-circle"></i>
          Active
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === "ended" ? styles.active : ""}`} 
          onClick={() => setFilter("ended")}
        >
          <i className="fas fa-trophy"></i>
          Ended
        </button>
      </div>
      
      <div className={styles.competitionsGrid}>
        {filteredCompetitions.map((competition) => (
          <div
            key={competition._id}
            className={`${styles.competitionCard} ${competition.status}`}
            onClick={() => handleCompetitionClick(competition)}
          >
            <div className={styles.competitionHeader}>
              <h3>{competition.name}</h3>
              <div className={styles.headerActions}>
                {getStatusBadge(competition.status)}
                <button 
                  className={styles.shareBtn}
                  onClick={(e) => handleShareCompetition(competition, e)}
                  title="Share Competition"
                >
                  <i className="fas fa-share-alt"></i>
                </button>
              </div>
            </div>
            <p className={styles.competitionDescription}>{competition.description}</p>
            <div className={styles.competitionMeta}>
              <div className={styles.metaItem}>
                <i className="fas fa-calendar-start"></i>
                <span>Starts: {formatDate(competition.startDate)}</span>
              </div>
              <div className={styles.metaItem}>
                <i className="fas fa-calendar-end"></i>
                <span>Ends: {formatDate(competition.endDate)}</span>
              </div>
              <div className={styles.metaItem}>
                <i className="fas fa-users"></i>
                <span>{competition.totalParticipants} participants</span>
              </div>
              <div className={styles.metaItem}>
                <i className="fas fa-book"></i>
                <span>
                  Select {competition.requiredCourses} from {competition.courses?.length || 0} courses
                </span>
              </div>
            </div>
            {competition.status === "active" && (
              <div className={styles.timeRemaining}>
                <i className="fas fa-hourglass-half"></i>
                <span>{getTimeRemaining(competition.endDate)}</span>
              </div>
            )}
            <div className={styles.competitionAction}>
              {competition.status === "upcoming" && (
                <span className={`${styles.actionText}`}>
                  <i className="fas fa-clock"></i>
                  Starts {formatDate(competition.startDate)}
                </span>
              )}
              {competition.status === "active" && (
                <span className={`${styles.actionText} ${styles.participate}`}>
                  <i className="fas fa-play"></i>
                  Participate Now
                </span>
              )}
              {competition.status === "ended" && (
                <span className={`${styles.actionText} ${styles.leaderboard}`}>
                  <i className="fas fa-trophy"></i>
                  View Leaderboard
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {filteredCompetitions.length === 0 && (
        <div className={styles.emptyState}>
          <i className="fas fa-trophy"></i>
          <h3>No competitions found</h3>
          <p>{filter === "all" ? "No competitions available at the moment" : `No ${filter} competitions found`}</p>
          <Link to="/home" className={`${styles.btn} ${styles.btnPrimary}`}>
            Back to Home
          </Link>
        </div>
      )}
    </div>
  )
}

export default Competitions