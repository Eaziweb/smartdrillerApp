"use client"
import { useState, useEffect } from "react"
import styles from "../../styles/ReportsManagement.module.css"
import api from "../../utils/api";

const ReportsManagement = () => {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [reportsPerPage] = useState(10)
  const [statusFilter, setStatusFilter] = useState("")

  useEffect(() => {
    fetchReports()
  }, [currentPage, statusFilter])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: reportsPerPage,
        status: statusFilter,
      })
      
      const token = localStorage.getItem("token")
      const response = await api.get(`/reports?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      setReports(response.data.reports || [])
    } catch (error) {
      console.error("Error fetching reports:", error)
      showToast("Error fetching reports", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (reportId, newStatus) => {
    try {
      const token = localStorage.getItem("token")
      const response = await api.put(
        `/reports/${reportId}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )
      
      if (response.status === 200) {
        showToast("Report status updated successfully!", "success")
        fetchReports()
      } else {
        showToast("Error updating report status", "error")
      }
    } catch (error) {
      console.error("Error updating report status:", error)
      showToast("Error updating report status", "error")
    }
  }

  const handleDeleteReport = async (reportId) => {
    if (window.confirm("Are you sure you want to delete this report?")) {
      try {
        const token = localStorage.getItem("token")
        const response = await api.delete(`/reports/${reportId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        
        if (response.status === 200) {
          showToast("Report deleted successfully!", "success")
          fetchReports()
        } else {
          showToast("Error deleting report", "error")
        }
      } catch (error) {
        console.error("Error deleting report:", error)
        showToast("Error deleting report", "error")
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "var(--pending-color)"
      case "reviewed":
        return "var(--reviewed-color)"
      case "resolved":
        return "var(--resolved-color)"
      case "dismissed":
        return "var(--dismissed-color)"
      default:
        return "var(--pending-color)"
    }
  }

  const showToast = (message, type = "success") => {
    const toast = document.createElement("div")
    toast.className = `${styles.toast} ${styles[`toast${type.charAt(0).toUpperCase() + type.slice(1)}`]}`
    toast.innerHTML = `
      <i class="fas ${type === "success" ? "fa-check-circle" : "fa-exclamation-triangle"}"></i>
      <span>${message}</span>
    `
    document.body.appendChild(toast)
    setTimeout(() => toast.classList.add("show"), 100)
    setTimeout(() => {
      toast.classList.remove("show")
      setTimeout(() => document.body.removeChild(toast), 300)
    }, 3000)
  }

  const indexOfLastReport = currentPage * reportsPerPage
  const indexOfFirstReport = indexOfLastReport - reportsPerPage
  const currentReports = reports.slice(indexOfFirstReport, indexOfLastReport)
  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  return (
    <div className={styles.reportsManagement}>
      <div className={styles.managementHeader}>
        <h2>User Reports Management</h2>
      </div>
      
      {/* Filter */}
      <div className={styles.reportsFilters}>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)} 
          className={styles.statusFilter}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>
      
      {/* Reports List */}
      <div className={styles.reportsList}>
        {loading ? (
          <div className={styles.loading}>
            <i className="fas fa-spinner fa-spin"></i>
            Loading reports...
          </div>
        ) : currentReports.length > 0 ? (
          currentReports.map((report, index) => (
            <div key={report._id} className={styles.reportItem}>
              <div className={styles.reportHeader}>
                <span className={styles.reportNumber}>#{indexOfFirstReport + index + 1}</span>
                <span 
                  className={styles.reportStatus} 
                  style={{ backgroundColor: getStatusColor(report.status) }}
                >
                  {report.status.toUpperCase()}
                </span>
                <span className={styles.reportDate}>
                  {new Date(report.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className={styles.reportContent}>
                <div className={styles.reportQuestion}>
                  <h4>Reported Question:</h4>
                  <p>{report.question?.question || "Question not found"}</p>
                  <div className={styles.questionDetails}>
                    <span>Course: {report.question?.course}</span>
                    <span>Year: {report.question?.year}</span>
                    <span>Topic: {report.question?.topic}</span>
                  </div>
                </div>
                
                <div className={styles.reportDetails}>
                  <h4>Report Details:</h4>
                  <p>
                    <strong>Type:</strong> {report.type}
                  </p>
                  <p>
                    <strong>Description:</strong> {report.description}
                  </p>
                  <p>
                    <strong>Reported by:</strong> {report.user?.email || "Unknown user"}
                  </p>
                </div>
              </div>
              
              <div className={styles.reportActions}>
                <select
                  value={report.status}
                  onChange={(e) => handleStatusUpdate(report._id, e.target.value)}
                  className={styles.statusSelect}
                >
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
                <button 
                  className={styles.btnDelete} 
                  onClick={() => handleDeleteReport(report._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.noReports}>No reports found</div>
        )}
      </div>
      
      {/* Pagination */}
      {reports.length > reportsPerPage && (
        <div className={styles.pagination}>
          {Array.from({ length: Math.ceil(reports.length / reportsPerPage) }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => paginate(i + 1)}
              className={`${styles.pageBtn} ${currentPage === i + 1 ? styles.active : ""}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ReportsManagement