// pages/admin/PaymentManagement.js
"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/PaymentManagement.module.css";
import api from "../../utils/api"

const PaymentManagement = () => {
  const { user, logout } = useAuth()
  const [payments, setPayments] = useState([])
  const [filteredPayments, setFilteredPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [retryingPayment, setRetryingPayment] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [showPaymentDetails, setShowPaymentDetails] = useState(false)
  const [retrySuccess, setRetrySuccess] = useState(false)
  const [retryError, setRetryError] = useState("")

  useEffect(() => {
    loadPayments()
  }, [])

  useEffect(() => {
    filterPayments()
  }, [payments, searchTerm, statusFilter])

  const loadPayments = async () => {
    try {
      const response = await api.get("/api/payments/all")
      setPayments(response.data.payments)
    } catch (error) {
      console.error("Failed to load payments:", error)
    }
    setLoading(false)
  }

  const filterPayments = () => {
    let filtered = [...payments]
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(payment => 
        payment.user?.email?.toLowerCase().includes(term) || 
        payment.user?.fullName?.toLowerCase().includes(term) ||
        payment.transactionId?.toLowerCase().includes(term)
      )
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(payment => payment.status === statusFilter)
    }
    
    setFilteredPayments(filtered)
  }

  const handleRetryPayment = async (paymentId) => {
    setRetryingPayment(paymentId)
    setRetrySuccess(false)
    setRetryError("")
    
    try {
      const response = await api.post(`/api/payments/retry-verification/${paymentId}`)
      if (response.data.success) {
        setRetrySuccess(true)
        // Update the payment in the list
        const updatedPayments = payments.map(p => 
          p._id === paymentId ? { ...p, status: "successful" } : p
        )
        setPayments(updatedPayments)
        
        // Show success message
        showMessage("Payment verification successful! User subscription activated.", "success")
      } else {
        setRetryError(response.data.message || "Failed to verify payment")
        showMessage(response.data.message || "Failed to verify payment", "error")
      }
    } catch (error) {
      setRetryError(error.response?.data?.message || error.message)
      showMessage(error.response?.data?.message || error.message, "error")
    } finally {
      setRetryingPayment(null)
    }
  }

  const handleViewDetails = (payment) => {
    setSelectedPayment(payment)
    setShowPaymentDetails(true)
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatCurrency = (amount) => {
    return `₦${amount.toLocaleString()}`
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "successful":
        return <span className={`${styles.statusBadge} ${styles.success}`}>Successful</span>
      case "pending":
        return <span className={`${styles.statusBadge} ${styles.warning}`}>Pending</span>
      case "failed":
        return <span className={`${styles.statusBadge} ${styles.error}`}>Failed</span>
      default:
        return <span className={styles.statusBadge}>{status}</span>
    }
  }

  return (
    <div className={styles.adminPage}>
      <div className={styles.adminContainer}>
        <div className={styles.adminHeader}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <div>
              <h1>Payment Management</h1>
              <p>View and manage all payment transactions</p>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <Link to="/admin" className={styles.backBtn}>
                <i className="fas fa-arrow-left"></i> Back to Dashboard
              </Link>
              <button onClick={logout} className={styles.logoutBtn}>
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className={styles.filterSection}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              placeholder="Search by user email, name, or transaction ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className={styles.inputGroup}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className={styles.inputGroup}>
            <button 
              className={styles.submitBtn}
              onClick={loadPayments}
              disabled={loading}
            >
              <i className={`fas ${loading ? "fa-spinner fa-spin" : "fa-sync-alt"}`}></i>
              <span>{loading ? "Loading..." : "Refresh"}</span>
            </button>
          </div>
        </div>
        
        {/* Payment Table */}
        <div className={styles.adminSection}>
          <h2>Payment History</h2>
          <div className={styles.paymentTable}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Subscription Type</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <tr key={payment._id}>
                      <td>{payment.transactionId}</td>
                      <td>
                        <div>
                          <div>{payment.user?.fullName || "Unknown"}</div>
                          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                            {payment.user?.email || "No email"}
                          </div>
                        </div>
                      </td>
                      <td>{formatCurrency(payment.amount)}</td>
                      <td>{getStatusBadge(payment.status)}</td>
                      <td>{payment.subscriptionType}</td>
                      <td>{formatDate(payment.createdAt)}</td>
                      <td>
                        <button 
                          className={styles.editBtn}
                          onClick={() => handleViewDetails(payment)}
                          title="View Details"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        {payment.status === "pending" && (
                          <button 
                            className={styles.editBtn}
                            onClick={() => handleRetryPayment(payment._id)}
                            disabled={retryingPayment === payment._id}
                            title="Retry Verification"
                            style={{ marginLeft: "0.5rem", color: "var(--warning-color)" }}
                          >
                            <i className={`fas ${retryingPayment === payment._id ? "fa-spinner fa-spin" : "fa-redo"}`}></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className={styles.emptyState}>
                      {loading ? "Loading payments..." : "No payments found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {filteredPayments.length === 0 && !loading && (
            <div className={styles.emptyState}>
              <i className="fas fa-credit-card"></i>
              <p>No payments found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Payment Details Modal */}
      {showPaymentDetails && selectedPayment && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button className={styles.closeButton} onClick={() => setShowPaymentDetails(false)}>
              <i className="fas fa-times"></i>
            </button>
            
            <div className={styles.modalHeader}>
              <h2>Payment Details</h2>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.detailsGrid}>
                <div className={styles.detailsRow}>
                  <div className={styles.detailsLabel}>Transaction ID:</div>
                  <div className={styles.detailsValue}>{selectedPayment.transactionId}</div>
                </div>
                <div className={styles.detailsRow}>
                  <div className={styles.detailsLabel}>Flutterwave Reference:</div>
                  <div className={styles.detailsValue}>{selectedPayment.flutterwaveRef || "N/A"}</div>
                </div>
                <div className={styles.detailsRow}>
                  <div className={styles.detailsLabel}>User:</div>
                  <div className={styles.detailsValue}>
                    {selectedPayment.user?.fullName || "Unknown"} 
                    {selectedPayment.user?.email && ` (${selectedPayment.user.email})`}
                  </div>
                </div>
                <div className={styles.detailsRow}>
                  <div className={styles.detailsLabel}>Amount:</div>
                  <div className={styles.detailsValue}>{formatCurrency(selectedPayment.amount)}</div>
                </div>
                <div className={styles.detailsRow}>
                  <div className={styles.detailsLabel}>Status:</div>
                  <div className={styles.detailsValue}>{getStatusBadge(selectedPayment.status)}</div>
                </div>
                <div className={styles.detailsRow}>
                  <div className={styles.detailsLabel}>Subscription Type:</div>
                  <div className={styles.detailsValue}>{selectedPayment.subscriptionType}</div>
                </div>
                <div className={styles.detailsRow}>
                  <div className={styles.detailsLabel}>Created:</div>
                  <div className={styles.detailsValue}>
                    {formatDate(selectedPayment.createdAt)} at {new Date(selectedPayment.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                {selectedPayment.paidAt && (
                  <div className={styles.detailsRow}>
                    <div className={styles.detailsLabel}>Paid At:</div>
                    <div className={styles.detailsValue}>
                      {formatDate(selectedPayment.paidAt)} at {new Date(selectedPayment.paidAt).toLocaleTimeString()}
                    </div>
                  </div>
                )}
                {selectedPayment.failedAt && (
                  <div className={styles.detailsRow}>
                    <div className={styles.detailsLabel}>Failed At:</div>
                    <div className={styles.detailsValue}>
                      {formatDate(selectedPayment.failedAt)} at {new Date(selectedPayment.failedAt).toLocaleTimeString()}
                    </div>
                  </div>
                )}
                {selectedPayment.failureReason && (
                  <div className={styles.detailsRow}>
                    <div className={styles.detailsLabel}>Failure Reason:</div>
                    <div className={styles.detailsValue}>{selectedPayment.failureReason}</div>
                  </div>
                )}
                {selectedPayment.meta && (
                  <>
                    <div className={styles.detailsRow}>
                      <div className={styles.detailsLabel}>Months:</div>
                      <div className={styles.detailsValue}>{selectedPayment.meta.months || 1}</div>
                    </div>
                    <div className={styles.detailsRow}>
                      <div className={styles.detailsLabel}>Payment Plan:</div>
                      <div className={styles.detailsValue}>{selectedPayment.meta.paymentPlan}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              {selectedPayment.status === "pending" && (
                <button 
                  className={styles.submitBtn}
                  onClick={() => {
                    setShowPaymentDetails(false)
                    handleRetryPayment(selectedPayment._id)
                  }}
                  disabled={retryingPayment === selectedPayment._id}
                >
                  <i className={`fas ${retryingPayment === selectedPayment._id ? "fa-spinner fa-spin" : "fa-redo"}`}></i>
                  <span>Retry Verification</span>
                </button>
              )}
              <button 
                className={styles.cancelBtn}
                onClick={() => setShowPaymentDetails(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Retry Status Modal */}
      {(retrySuccess || retryError) && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{retrySuccess ? "Retry Successful" : "Retry Failed"}</h2>
            </div>
            <div className={styles.modalBody}>
              {retrySuccess ? (
                <div className={styles.successMessage}>
                  <i className="fas fa-check-circle"></i>
                  <p>Payment verification was successful. The user's subscription has been activated.</p>
                </div>
              ) : (
                <div className={styles.errorMessage}>
                  <i className="fas fa-exclamation-triangle"></i>
                  <p>{retryError}</p>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.submitBtn}
                onClick={() => {
                  setRetrySuccess(false)
                  setRetryError("")
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentManagement