// MaterialManagement.jsx (Frontend)
"use client"
import { useState, useEffect } from "react"
import styles from "../../styles/MaterialManagement.module.css"
import api from "../../utils/api"

const MaterialManagement = () => {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    search: "",
    course: "",
    type: "",
    status: "",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [approveModal, setApproveModal] = useState({ open: false, id: null })
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, reason: "" })
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null })
const [courses, setCourses] = useState([]);
  useEffect(() => {
    loadMaterials()
  }, [currentPage, filters])


useEffect(() => {
  loadCourses();
}, []);

// Add this function
const loadCourses = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await api.get("/api/materials/courses", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (response.data.success) {
      setCourses(response.data.courses);
    }
  } catch (error) {
    console.error("Error loading courses:", error);
  }
};
  const loadMaterials = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...filters,
      })
      
      const token = localStorage.getItem("token")
      const response = await api.get(`/api/admin/materials?${queryParams}`, {
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

  const handleApproveClick = (id) => {
    setApproveModal({ open: true, id })
  }

  const handleRejectClick = (id) => {
    setRejectModal({ open: true, id, reason: "" })
  }

  const handleDeleteClick = (id) => {
    setDeleteModal({ open: true, id })
  }

const confirmApprove = async () => {
  const materialId = approveModal.id;
  setApproveModal({ open: false, id: null });
  try {
    const token = localStorage.getItem("token");
    const response = await api.put(`/api/admin/materials/${materialId}/approve`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (response.data.success) {
      showNotification("Material approved successfully", "success");
      loadMaterials();
    } else {
      throw new Error(response.data.message || "Approval failed");
    }
  } catch (error) {
    console.error("Error approving material:", error);
    showNotification(error.response?.data?.message || "Error approving material", "error");
  }
};

const confirmReject = async () => {
  const materialId = rejectModal.id;
  const reason = rejectModal.reason;
  setRejectModal({ open: false, id: null, reason: "" });
  try {
    const token = localStorage.getItem("token");
    const response = await api.put(`/api/admin/materials/${materialId}/reject`, { reason }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (response.data.success) {
      showNotification("Material rejected successfully", "success");
      loadMaterials();
    } else {
      throw new Error(response.data.message || "Rejection failed");
    }
  } catch (error) {
    console.error("Error rejecting material:", error);
    showNotification(error.response?.data?.message || "Error rejecting material", "error");
  }
};

const confirmDelete = async () => {
  const materialId = deleteModal.id;
  setDeleteModal({ open: false, id: null });
  try {
    const token = localStorage.getItem("token");
    const response = await api.delete(`/api/admin/materials/${materialId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (response.data.success) {
      showNotification("Material deleted successfully", "success");
      loadMaterials();
    } else {
      throw new Error(response.data.message || "Deletion failed");
    }
  } catch (error) {
    console.error("Error deleting material:", error);
    showNotification(error.response?.data?.message || "Error deleting material", "error");
  }
};


const downloadMaterial = async (materialId, filename) => {
  try {
    const response = await api.get(`/api/materials/${materialId}/download`);

    if (response.data.success && response.data.url) {
      // Create a temporary link to force download
      const link = document.createElement("a");
      link.href = response.data.url;
      link.setAttribute("download", filename);
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showNotification("Download started", "success");
    } else {
      showNotification("File not available for download", "error");
    }
  } catch (error) {
    console.error("Error downloading material:", error);
    showNotification("Error downloading material", "error");
  }
};

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({ search: "", course: "", type: "", status: "" })
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
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending Approval</option>
          </select>
<select
  value={filters.course}
  onChange={(e) => handleFilterChange("course", e.target.value)}
  className={styles.filterSelect}
>
  <option value="">All Courses</option>
  {courses.map((course) => (
    <option key={course._id} value={course._id}>
      {course.courseName} ({course.courseCode})
    </option>
  ))}
</select>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange("type", e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Types</option>
            <option value="pdf">PDF</option>
            <option value="docx">Document</option>
            <option value="ppt">Presentation</option>
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
                <th>Status</th>
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
                        <div className={styles.filename}>{material.originalName}</div>
                      </div>
                    </div>
                  </td>
                  <td>{material.courseName}</td>
                  <td>{material.uploadedBy?.fullName || "Unknown"}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${material.isApproved ? styles.approved : styles.pending}`}>
                      {material.isApproved ? "Approved" : "Pending"}
                    </span>
                  </td>
                  <td>{formatFileSize(material.fileSize)}</td>
                  <td>{new Date(material.createdAt).toLocaleDateString()}</td>
                  <td>{material.downloadCount || 0}</td>
                  <td>
                    <div className={styles.actionButtons}>
                     <button
// Fixed
onClick={() => downloadMaterial(material._id, material.originalName)}
  className={styles.downloadBtn}
  title="Download"
>
  <i className="fas fa-download"></i>
</button>


                      {!material.isApproved && (
                        <>
                          <button
                            onClick={() => handleApproveClick(material._id)}
                            className={styles.approveBtn}
                            title="Approve"
                          >
                            <i className="fas fa-check"></i>
                          </button>
                          <button
                            onClick={() => handleRejectClick(material._id)}
                            className={styles.rejectBtn}
                            title="Reject"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </>
                      )}
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

      {/* Approve Confirmation Modal */}
      {approveModal.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Confirm Approval</h2>
            <p>Are you sure you want to approve this material?</p>
            <div className={styles.modalActions}>
              <button onClick={confirmApprove} className={styles.confirmBtn}>Yes, Approve</button>
              <button onClick={() => setApproveModal({ open: false, id: null })} className={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {rejectModal.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Reject Material</h2>
            <p>Please provide a reason for rejection:</p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({...rejectModal, reason: e.target.value})}
              className={styles.reasonInput}
              placeholder="Reason for rejection..."
              rows={3}
            />
            <div className={styles.modalActions}>
              <button onClick={confirmReject} className={styles.confirmBtn}>Reject</button>
              <button onClick={() => setRejectModal({ open: false, id: null, reason: "" })} className={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Confirm Deletion</h2>
            <p>Are you sure you want to delete this material?</p>
            <div className={styles.modalActions}>
              <button onClick={confirmDelete} className={styles.confirmBtn}>Yes, Delete</button>
              <button onClick={() => setDeleteModal({ open: false, id: null })} className={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MaterialManagement