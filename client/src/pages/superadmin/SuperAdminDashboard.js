"use client"
import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { Link } from "react-router-dom"
import styles from "../../styles/SuperAdminDashboard.module.css"
import api from "../../utils/api";

const SuperAdminDashboard = () => {
  const { user, logout } = useAuth()
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalAdmins: 0,
  })
  const [admins, setAdmins] = useState([])
  const [payments, setPayments] = useState([])
  const [newAdmin, setNewAdmin] = useState({
    fullName: "",
    email: "",
    password: "",
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [adminExists, setAdminExists] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [revenueRes, adminsRes] = await Promise.all([
        api.get("/api/superadmin/revenue"),
        api.get("/api/superadmin/admins"),
      ])
      
      setStats({
        totalRevenue: revenueRes.data.totalRevenue,
        totalAdmins: adminsRes.data.length,
      })
      setAdmins(adminsRes.data)
      setPayments(revenueRes.data.payments || [])
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      showMessage("Failed to load dashboard data", "error");
    }
    setLoading(false)
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    
    // Reset admin exists state
    setAdminExists(false)
    
    try {
      // First check if admin already exists
      const existingAdmin = admins.find(admin => admin.email === newAdmin.email)
      if (existingAdmin) {
        setAdminExists(true)
        return
      }
      
      await api.post("/api/superadmin/admins", newAdmin)
      setNewAdmin({ fullName: "", email: "", password: "" })
      loadDashboardData()
      showMessage("Admin created successfully!", "success")
    } catch (error) {
      // Handle case where admin already exists (backend check)
      if (error.response && error.response.status === 400) {
        setAdminExists(true)
      } else {
        showMessage("Failed to create admin", "error")
      }
    }
  }

  const handleDeleteAdmin = async (id) => {
    if (window.confirm("Are you sure you want to delete this admin?")) {
      try {
        await api.delete(`/api/superadmin/admins/${id}`)
        loadDashboardData()
        showMessage("Admin deleted successfully!", "success")
      } catch (error) {
        showMessage("Failed to delete admin", "error")
      }
    }
  }

  const handleManualVerify = async (transactionId) => {
    try {
      const response = await api.post("/api/payments/manual-verify", { transactionId });
      
      if (response.data.status === "success") {
        showMessage("Payment verified successfully!", "success");
        loadDashboardData();
      } else {
        showMessage("Failed to verify payment: " + response.data.message, "error");
      }
    } catch (error) {
      console.error("Manual verification error:", error);
      showMessage("Error verifying payment: " + error.message, "error");
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1>SuperAdmin Dashboard</h1>
              <p>Welcome back, {user?.fullName}</p>
            </div>
            <button
              onClick={logout}
              style={{
                background: "var(--danger-color)",
                color: "white",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className={styles.adminTabs}>
          <button 
            className={`${styles.adminTab} ${activeTab === "dashboard" ? styles.active : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>
          <button 
            className={`${styles.adminTab} ${activeTab === "admins" ? styles.active : ""}`}
            onClick={() => setActiveTab("admins")}
          >
            Admin Management
          </button>
          <button 
            className={`${styles.adminTab} ${activeTab === "revenue" ? styles.active : ""}`}
            onClick={() => setActiveTab("revenue")}
          >
            Revenue
          </button>
        </div>
        
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className={styles.adminSection}>
            {/* Stats Grid */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <i className="fas fa-users"></i>
                </div>
                <div className={styles.statValue}>{stats.totalAdmins}</div>
                <div className={styles.statLabel}>Total Admins</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <i className="fas fa-naira-sign"></i>
                </div>
                <div className={styles.statValue}>₦{stats.totalRevenue.toLocaleString()}</div>
                <div className={styles.statLabel}>Total Revenue</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Admin Management Tab */}
        {activeTab === "admins" && (
          <div className={styles.adminSection}>
            <h2>Admin Management</h2>
            
            {/* Create Admin Form */}
            <div className={styles.adminFormContainer}>
              <h3>Create New Admin</h3>
              <form onSubmit={handleCreateAdmin} className={styles.adminForm}>
                <div className={styles.inputRow}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="fullName">Full Name</label>
                    <input
                      type="text"
                      id="fullName"
                      value={newAdmin.fullName}
                      onChange={(e) => setNewAdmin({ ...newAdmin, fullName: e.target.value })}
                      required
                      placeholder="Admin full name"
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      value={newAdmin.email}
                      onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                      required
                      placeholder="Admin email"
                    />
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    required
                    placeholder="Admin password"
                  />
                </div>
                
                {/* Show error if admin already exists */}
                {adminExists && (
                  <div className={styles.errorMessage}>
                    Admin with email "{newAdmin.email}" already exists
                  </div>
                )}
                
                <button type="submit" className={styles.submitBtn}>
                  <span>Create Admin</span>
                  <i className="fas fa-plus"></i>
                </button>
              </form>
            </div>
            
            {/* Admins List */}
            <div style={{ marginTop: "2rem" }}>
              <h3>Admins List</h3>
              {admins.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>
                  No admins created yet
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className={styles.adminTable}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map((admin) => (
                        <tr key={admin._id}>
                          <td>{admin.fullName}</td>
                          <td>{admin.email}</td>
                          <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button 
                              onClick={() => handleDeleteAdmin(admin._id)} 
                              className={styles.deleteBtn}
                              style={{ marginRight: "0.5rem" }}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Revenue Tab */}
        {activeTab === "revenue" && (
          <div className={styles.adminSection}>
            <h2>Revenue Overview</h2>
            
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <i className="fas fa-naira-sign"></i>
                </div>
                <div className={styles.statValue}>₦{stats.totalRevenue.toLocaleString()}</div>
                <div className={styles.statLabel}>Total Revenue</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <i className="fas fa-credit-card"></i>
                </div>
                <div className={styles.statValue}>{payments.length}</div>
                <div className={styles.statLabel}>Total Transactions</div>
              </div>
            </div>
            
            {/* Payments List */}
            <div style={{ marginTop: "2rem" }}>
              <h3>Payment Transactions</h3>
              {payments.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>
                  No payment transactions yet
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className={styles.adminTable}>
                    <thead>
                      <tr>
                        <th>User ID</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Transaction ID</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment._id}>
                          <td>{payment.user}</td>
                          <td>₦{payment.amount.toLocaleString()}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${payment.status === "successful" ? styles.subscribed : styles.expired}`}>
                              {payment.status}
                            </span>
                          </td>
                          <td>{payment.transactionId}</td>
                          <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                          <td>
                            {payment.status !== "successful" && (
                              <button 
                                onClick={() => handleManualVerify(payment.transactionId)}
                                className={styles.submitBtn}
                                style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                              >
                                Verify
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SuperAdminDashboard