"use client"
import { useState, useEffect } from "react"
import styles from "../../styles/MaterialManagement.module.css"
import api from "../../utils/api";

const MaterialManagement = () => {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    search: "",
    course: "",
    type: "",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })

  useEffect(() => {
    loadMaterials()
  }, [currentPage, filters])

  const loadMaterials = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...filters,
      })
      
      const token = localStorage.getItem("token")
      const response = await api.get(`/admin/materials?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (response.data.success) {
        setMaterials(response.data.materials)
        setTotalPages(response.data.totalPages)
      }
    } catch (error) {
      console.error("Error loading materials:", error)
      showNotification("Error loading materials", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (id) => {
    setConfirmModal({ open: true, id })
  }

  const confirmDelete = async () => {
    const materialId = confirmModal.id
    setConfirmModal({ open: false, id: null })
    try {
      const token = localStorage.getItem("token")
      const response = await api.delete(`/admin/materials/${materialId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (response.data.success) {
        showNotification("Material deleted successfully", "success")
        loadMaterials()
      } else {
        throw new Error(response.data.message)
      }
    } catch (error) {
      console.error("Error deleting material:", error)
      showNotification("Error deleting material", "error")
    }
  }

  const downloadMaterial = async (materialId, filename) => {
    try {
      const token = localStorage.getItem("token")
      const response = await api.get(`/admin/materials/${materialId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob', // Important for file downloads
      })
      
      if (response.status === 200) {
        const blob = new Blob([response.data])
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        showNotification("Download started", "success")
      }
    } catch (error) {
      console.error("Error downloading material:", error)
      showNotification("Error downloading material", "error")
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({ search: "", course: "", type: "" })
    setCurrentPage(1)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const showNotification = (message, type) => {
    const notification = document.createElement("div")
    notification.className = `${styles.notification} ${styles[type]}`
    notification.innerHTML = `
      <i class="fas ${type === "success" ? "fa-check-circle" : "fa-exclamation-triangle"}"></i>
      <span>${message}</span>
    `
    document.body.appendChild(notification)
    setTimeout(() => {
      notification.style.animation = "slideOutRight 0.3s ease forwards"
      setTimeout(() => notification.remove(), 300)
    }, 3000)
  }

  const goBack = () => {
    window.history.back()
  }

  return (
    <div className={styles.materialManagement}>
      {/* Header */}
      <div className={styles.managementHeader}>
        <button className={styles.backBtn} onClick={goBack}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className={styles.headerContent}>
          <h1>Material Management</h1>
          <p>Manage all uploaded materials</p>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filtersSection}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search materials..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterContainer}>
          <select
            value={filters.course}
            onChange={(e) => handleFilterChange("course", e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Courses</option>
          </select>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange("type", e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Types</option>
            <option value="pdf">PDF</option>
            <option value="doc">Document</option>
            <option value="ppt">Presentation</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>
          <button onClick={clearFilters} className={styles.clearBtn}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i>
          Loading materials...
        </div>
      ) : (
        <div className={styles.materialsTable}>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Course</th>
                <th>Uploader</th>
                <th>Size</th>
                <th>Upload Date</th>
                <th>Downloads</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => (
                <tr key={material._id}>
                  <td>
                    <div className={styles.materialTitleCell}>
                      <i className={`fas fa-file`}></i>
                      <div>
                        <div className={styles.title}>{material.title}</div>
                        <div className={styles.filename}>{material.filename}</div>
                      </div>
                    </div>
                  </td>
                  <td>{material.courseName}</td>
                  <td>{material.uploaderName}</td>
                  <td>{formatFileSize(material.fileSize)}</td>
                  <td>{new Date(material.createdAt).toLocaleDateString()}</td>
                  <td>{material.downloadCount || 0}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        onClick={() => downloadMaterial(material._id, material.filename)}
                        className={styles.downloadBtn}
                        title="Download"
                      >
                        <i className="fas fa-download"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(material._id)}
                        className={styles.deleteBtn}
                        title="Delete"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={styles.pageBtn}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className={styles.pageBtn}
          >
            Next
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmModal.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Confirm Deletion</h2>
            <p>Are you sure you want to delete this material?</p>
            <div className={styles.modalActions}>
              <button onClick={confirmDelete} className={styles.confirmBtn}>Yes, Delete</button>
              <button onClick={() => setConfirmModal({ open: false, id: null })} className={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MaterialManagement