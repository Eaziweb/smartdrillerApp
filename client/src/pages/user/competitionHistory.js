"use client"
import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/EndedCompetitions.module.css"
import api from "../../utils/api";

const EndedCompetitions = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [competitions, setCompetitions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCompetitions()
  }, [])

  const fetchCompetitions = async () => {
    try {
      const response = await api.get("/api/competitions")
      // Filter competitions to only include ended ones
      const endedCompetitions = response.data.filter(comp => comp.status === "ended")
      setCompetitions(endedCompetitions)
    } catch (error) {
      console.error("Error fetching competitions:", error)
      showMessage("Failed to fetch competitions", "error")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const handleCompetitionClick = (competition) => {
    navigate(`/competitions/${competition._id}/leaderboard`)
  }

  const showMessage = (message, type = "info") => {
    const messageEl = document.createElement("div")
    messageEl.className = `${styles.messageToast} ${styles[type]}`
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
      <div className={styles.endedCompetitionsPage}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading ended competitions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.endedCompetitionsPage}>
      <div className={styles.endedCompetitionsHeader}>
        <Link to="/home" className={styles.backBtn}>
          <i className="fas fa-arrow-left"></i>
        </Link>
        <div className={styles.headerContent}>
          <h1>Ended Competitions</h1>
          <p>View results and leaderboards of past competitions</p>
        </div>
      </div>
      
      <div className={styles.competitionsGrid}>
        {competitions.map((competition) => (
          <div
            key={competition._id}
            className={styles.competitionCard}
            onClick={() => handleCompetitionClick(competition)}
          >
            <div className={styles.competitionHeader}>
              <h3>{competition.name}</h3>
              <span className={styles.statusBadge}>
                <i className="fas fa-check-circle"></i>
                ENDED
              </span>
            </div>
            <p className={styles.competitionDescription}>{competition.description}</p>
            <div className={styles.competitionMeta}>
              <div className={styles.metaItem}>
                <i className="fas fa-calendar-alt"></i>
                <span>Started: {formatDate(competition.startDate)}</span>
              </div>
              <div className={styles.metaItem}>
                <i className="fas fa-calendar-check"></i>
                <span>Ended: {formatDate(competition.endDate)}</span>
              </div>
              <div className={styles.metaItem}>
                <i className="fas fa-users"></i>
                <span>{competition.totalParticipants} participants</span>
              </div>
            </div>
            <div className={styles.competitionAction}>
              <span className={styles.actionText}>
                <i className="fas fa-trophy"></i>
                View Leaderboard
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {competitions.length === 0 && (
        <div className={styles.emptyState}>
          <i className="fas fa-trophy"></i>
          <h3>No ended competitions found</h3>
          <p>There are no past competitions to display at this time.</p>
        </div>
      )}
    </div>
  )
}

export default EndedCompetitions