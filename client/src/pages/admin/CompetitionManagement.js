"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import styles from "../../styles/CompetitionManagement.module.css"

const CompetitionManagement = () => {
  const [competitions, setCompetitions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCompetition, setEditingCompetition] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    requiredCourses: 1,
    instructions: "",
    graceMinutes: 30,
    leaderboardDelay: 30,
  })

  useEffect(() => {
    fetchCompetitions()
  }, [])

  const fetchCompetitions = async () => {
    try {
      const response = await axios.get("/api/admin/competitions")
      setCompetitions(response.data)
    } catch (error) {
      console.error("Error fetching competitions:", error)
      showMessage("Failed to fetch competitions", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editingCompetition) {
        await axios.put(`/api/admin/competitions/${editingCompetition._id}`, formData)
        showMessage("Competition updated successfully", "success")
      } else {
        await axios.post("/api/admin/competitions", formData)
        showMessage("Competition created successfully", "success")
      }
      setShowCreateModal(false)
      setEditingCompetition(null)
      resetForm()
      fetchCompetitions()
    } catch (error) {
      console.error("Error saving competition:", error)
      showMessage(error.response?.data?.message || "Failed to save competition", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (competition) => {
    setEditingCompetition(competition)
    setFormData({
      name: competition.name,
      description: competition.description,
      startDate: new Date(competition.startDate).toISOString().slice(0, 16),
      endDate: new Date(competition.endDate).toISOString().slice(0, 16),
      requiredCourses: competition.requiredCourses,
      instructions: competition.instructions || "",
      graceMinutes: competition.graceMinutes || 30,
      leaderboardDelay: competition.leaderboardDelay || 30,
    })
    setShowCreateModal(true)
  }

  const handleDelete = async (competitionId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this competition? This will also delete all questions and submissions.",
      )
    ) {
      return
    }
    try {
      await axios.delete(`/api/admin/competitions/${competitionId}`)
      showMessage("Competition deleted successfully", "success")
      fetchCompetitions()
    } catch (error) {
      console.error("Error deleting competition:", error)
      showMessage("Failed to delete competition", "error")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      requiredCourses: 1,
      instructions: "",
      graceMinutes: 30,
      leaderboardDelay: 30,
    })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const getStatusBadge = (status) => {
    const statusClasses = {
      upcoming: styles.statusUpcoming,
      active: styles.statusActive,
      ended: styles.statusEnded,
    }
    return <span className={`${styles.statusBadge} ${statusClasses[status]}`}>{status.toUpperCase()}</span>
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
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

  if (loading && competitions.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading competitions...</p>
      </div>
    )
  }

  return (
    <div className={styles.adminPage}>
      <div className={styles.adminHeader}>
        <Link to="/admin/dashboard" className={styles.backBtn}>
          <i className="fas fa-arrow-left"></i>
        </Link>
        <h1>Competition Management</h1>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowCreateModal(true)}>
          <i className="fas fa-plus"></i>
          Create Competition
        </button>
      </div>
      
      <div className={styles.adminContent}>
        <div className={styles.competitionsGrid}>
          {competitions.map((competition) => (
            <div key={competition._id} className={styles.competitionCard}>
              <div className={styles.competitionHeader}>
                <h3>{competition.name}</h3>
                {getStatusBadge(competition.status)}
              </div>
              <p className={styles.competitionDescription}>{competition.description}</p>
              <div className={styles.competitionDetails}>
                <div className={styles.detailItem}>
                  <i className="fas fa-calendar-start"></i>
                  <span>Start: {formatDate(competition.startDate)}</span>
                </div>
                <div className={styles.detailItem}>
                  <i className="fas fa-calendar-end"></i>
                  <span>End: {formatDate(competition.endDate)}</span>
                </div>
                <div className={styles.detailItem}>
                  <i className="fas fa-users"></i>
                  <span>{competition.totalParticipants} participants</span>
                </div>
                <div className={styles.detailItem}>
                  <i className="fas fa-book"></i>
                  <span>{competition.courses?.length || 0} courses</span>
                </div>
              </div>
              <div className={styles.competitionActions}>
                <Link to={`/admin/competitions/${competition._id}`} className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
                  <i className="fas fa-cog"></i>
                  Manage
                </Link>
                <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} onClick={() => handleEdit(competition)}>
                  <i className="fas fa-edit"></i>
                  Edit
                </button>
                <Link to={`/admin/competitions/${competition._id}/leaderboard`} className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`}>
                  <i className="fas fa-trophy"></i>
                  Leaderboard
                </Link>
                <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => handleDelete(competition._id)}>
                  <i className="fas fa-trash"></i>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {competitions.length === 0 && (
          <div className={styles.emptyState}>
            <i className="fas fa-trophy"></i>
            <h3>No competitions yet</h3>
            <p>Create your first competition to get started</p>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowCreateModal(true)}>
              Create Competition
            </button>
          </div>
        )}
      </div>
      
      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className={styles.competitionModalOverlay}>
          <div className={`${styles.competitionModal} ${styles.modalLg}`}>
            <div className={styles.competitionModalHeader}>
              <h3>{editingCompetition ? "Edit Competition" : "Create New Competition"}</h3>
              <button
                className={styles.closeBtn}
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingCompetition(null)
                  resetForm()
                }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.competitionModalBody}>
                <div className={styles.competitionFormGrid}>
                  <div className={styles.competitionInputGroup}>
                    <label htmlFor="name">Competition Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Enter competition name"
                    />
                  </div>
                  <div className={styles.competitionInputGroup}>
                    <label htmlFor="requiredCourses">Required Courses *</label>
                    <input
                      type="number"
                      id="requiredCourses"
                      name="requiredCourses"
                      value={formData.requiredCourses}
                      onChange={handleChange}
                      min="1"
                      required
                      placeholder="Number of courses users must select"
                    />
                  </div>
                  <div className={`${styles.competitionInputGroup} ${styles.fullWidth}`}>
                    <label htmlFor="description">Description *</label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      rows="3"
                      placeholder="Enter competition description"
                    />
                  </div>
                  <div className={styles.competitionInputGroup}>
                    <label htmlFor="startDate">Start Date & Time *</label>
                    <input
                      type="datetime-local"
                      id="startDate"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className={styles.competitionInputGroup}>
                    <label htmlFor="endDate">End Date & Time *</label>
                    <input
                      type="datetime-local"
                      id="endDate"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className={styles.competitionInputGroup}>
                    <label htmlFor="graceMinutes">Grace Period (minutes)</label>
                    <input
                      type="number"
                      id="graceMinutes"
                      name="graceMinutes"
                      value={formData.graceMinutes}
                      onChange={handleChange}
                      min="0"
                      placeholder="Grace period after competition ends"
                    />
                  </div>
                  <div className={styles.competitionInputGroup}>
                    <label htmlFor="leaderboardDelay">Leaderboard Delay (minutes)</label>
                    <input
                      type="number"
                      id="leaderboardDelay"
                      name="leaderboardDelay"
                      value={formData.leaderboardDelay}
                      onChange={handleChange}
                      min="0"
                      placeholder="Delay before showing leaderboard"
                    />
                  </div>
                  <div className={`${styles.competitionInputGroup} ${styles.fullWidth}`}>
                    <label htmlFor="instructions">Instructions</label>
                    <textarea
                      id="instructions"
                      name="instructions"
                      value={formData.instructions}
                      onChange={handleChange}
                      rows="4"
                      placeholder="Enter competition instructions for participants"
                    />
                  </div>
                </div>
              </div>
              <div className={styles.competitionModalFooter}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingCompetition(null)
                    resetForm()
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={loading}>
                  {loading ? "Saving..." : editingCompetition ? "Update Competition" : "Create Competition"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompetitionManagement