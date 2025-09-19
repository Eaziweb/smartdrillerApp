"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import styles from "../../styles/AdminDashboard.module.css"

const AdminDashboard = () => {
  const { user, logout } = useAuth()
  const [stats, setStats] = useState({
    totalUsers: 0,
    subscribedUsers: 0,
    subscriptionPercentage: 0,
    totalRevenue: 0,
  })
  const [universities, setUniversities] = useState([])
  const [showUniversityForm, setShowUniversityForm] = useState(false)
  const [editingUniversity, setEditingUniversity] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
    loadUniversities()
  }, [])

  const loadDashboardData = async () => {
    try {
      const response = await axios.get("/api/admin/dashboard")
      setStats(response.data)
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    }
    setLoading(false)
  }

  const loadUniversities = async () => {
    try {
      const response = await axios.get("/api/universities")
      setUniversities(response.data.universities)
    } catch (error) {
      console.error("Failed to load universities:", error)
    }
  }

  const handleSaveUniversity = async (universityData) => {
    try {
      if (editingUniversity) {
        await axios.put(`/api/universities/${editingUniversity._id}`, universityData)
        showMessage("University updated successfully!", "success")
      } else {
        await axios.post("/api/universities", universityData)
        showMessage("University added successfully!", "success")
      }
      loadUniversities()
      setShowUniversityForm(false)
      setEditingUniversity(null)
    } catch (error) {
      showMessage("Failed to save university", "error")
    }
  }

  const handleFetchUniversities = async () => {
    try {
      await axios.get("/api/universities/fetch-nigerian")
      showMessage("Universities fetched successfully!", "success")
      loadUniversities()
    } catch (error) {
      showMessage("Failed to fetch universities", "error")
    }
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
      <div className={styles.loading}>
        <i className="fas fa-spinner fa-spin"></i>
        Loading dashboard...
      </div>
    )
  }

  return (
    <div className={styles.adminPage}>
      <div className={styles.adminContainer}>
        <div className={styles.adminHeader}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <div>
              <h1>Admin Dashboard</h1>
              <p>Welcome back, {user?.fullName}</p>
            </div>
            <button onClick={logout} className={styles.logoutBtn}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-users"></i>
            </div>
            <div className={styles.statValue}>{stats.totalUsers}</div>
            <div className={styles.statLabel}>Total Users</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-user-check"></i>
            </div>
            <div className={styles.statValue}>{stats.subscribedUsers}</div>
            <div className={styles.statLabel}>Subscribed Users</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-percentage"></i>
            </div>
            <div className={styles.statValue}>{stats.subscriptionPercentage}%</div>
            <div className={styles.statLabel}>Subscription Rate</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="fas fa-naira-sign"></i>
            </div>
            <div className={styles.statValue}>₦{stats.totalRevenue.toLocaleString()}</div>
            <div className={styles.statLabel}>Total Revenue</div>
          </div>
        </div>
        
        {/* Admin Navigation Buttons */}
        <div className={styles.adminBtns}>
          <Link to="/admin/quiz" className={styles.adminBtn}>
            Quiz Management
          </Link>
          <Link to="/admin/reports" className={styles.adminBtn}>
            Report Management
          </Link>
          <Link to="/admin/competitions" className={styles.adminBtn}>
            Competition Management
          </Link>
          <Link to="/admin/notes" className={styles.adminBtn}>
            Notes Management
          </Link>
          <Link to="/admin/videos" className={styles.adminBtn}>
            Video Management
          </Link>
          <Link to="/admin/materials" className={styles.adminBtn}>
            Material Management
          </Link>
          <Link to="/admin/notifications" className={styles.adminBtn}>
            Notification Management
          </Link>
          <Link to="/admin/users" className={styles.adminBtn}>
            User Management
          </Link>
          {/* New Course of Study Management Button */}
          <Link to="/admin/courseofstudy" className={styles.adminBtn}>
            Course of Study Manag.
          </Link>
        </div>
        
        {/* University Management Section */}
        <div className={styles.adminSection}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2>University Management</h2>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button 
                className={styles.submitBtn}
                onClick={handleFetchUniversities}
              >
                <i className="fas fa-download"></i>
                <span>Fetch Nigerian Universities</span>
              </button>
              <button 
                className={styles.submitBtn}
                onClick={() => {
                  setEditingUniversity(null)
                  setShowUniversityForm(true)
                }}
              >
                <i className="fas fa-plus"></i>
                <span>Add University</span>
              </button>
            </div>
          </div>
          
          <div className={styles.universityTable}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>University Name</th>
                  <th>Monthly Price</th>
                  <th>Semester Price</th>
                  <th>Semester Active</th>
                  <th>Semester End Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {universities.map((university) => (
                  <tr key={university._id}>
                    <td>{university.name}</td>
                    <td>₦{university.monthlyPrice}</td>
                    <td>₦{university.semesterPrice}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${university.semesterActive ? styles.subscribed : styles.expired}`}>
                        {university.semesterActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{new Date(university.globalSubscriptionEnd).toLocaleDateString()}</td>
                    <td>
                      <button 
                        className={styles.editBtn}
                        onClick={() => {
                          setEditingUniversity(university)
                          setShowUniversityForm(true)
                        }}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {universities.length === 0 && (
            <div className={styles.emptyState}>
              <i className="fas fa-university"></i>
              <p>No universities found. Click "Fetch Nigerian Universities" to get started.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* University Form Modal */}
      {showUniversityForm && (
        <UniversityFormModal
          university={editingUniversity}
          onSave={handleSaveUniversity}
          onClose={() => {
            setShowUniversityForm(false)
            setEditingUniversity(null)
          }}
        />
      )}
    </div>
  )
}

// University Form Modal Component
const UniversityFormModal = ({ university, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: university?.name || "",
    monthlyPrice: university?.monthlyPrice || 2000,
    semesterPrice: university?.semesterPrice || 6000,
    semesterActive: university?.semesterActive || false,
    globalSubscriptionEnd: university?.globalSubscriptionEnd
      ? new Date(university.globalSubscriptionEnd).toISOString().split('T')[0]
      : new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  })
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    })
  }
  
  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
        
        <div className={styles.modalHeader}>
          <h2>{university ? "Edit University" : "Add University"}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.adminForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="name">University Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className={styles.inputRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="monthlyPrice">Monthly Price (₦)</label>
              <input
                type="number"
                id="monthlyPrice"
                name="monthlyPrice"
                value={formData.monthlyPrice}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="semesterPrice">Semester Price (₦)</label>
              <input
                type="number"
                id="semesterPrice"
                name="semesterPrice"
                value={formData.semesterPrice}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className={styles.inputGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="semesterActive"
                checked={formData.semesterActive}
                onChange={handleChange}
              />
              <span>Activate Semester Plan</span>
            </label>
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="globalSubscriptionEnd">Semester End Date</label>
            <input
              type="date"
              id="globalSubscriptionEnd"
              name="globalSubscriptionEnd"
              value={formData.globalSubscriptionEnd}
              onChange={handleChange}
              required
            />
            <small style={{ color: "var(--text-secondary)", marginTop: "0.5rem", display: "block" }}>
              All semester subscriptions for this university will expire on this date
            </small>
          </div>
          
          <button type="submit" className={styles.submitBtn}>
            <span>{university ? "Update University" : "Add University"}</span>
            <i className="fas fa-save"></i>
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminDashboard