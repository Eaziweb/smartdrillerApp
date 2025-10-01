"use client"
import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/Materials.module.css"
import api from "../../utils/api"

const Materials = () => {
  const { user } = useAuth()
  const [materials, setMaterials] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [filters, setFilters] = useState({
    search: "",
    course: "",
    type: "",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    course: "",
    file: null,
  })

  useEffect(() => {
    loadCourses()
    loadMaterials()
  }, [currentPage, filters])

  const loadCourses = async () => {
    setCoursesLoading(true)
    try {
      const response = await api.get("/api/materials/courses")
      
      if (response.data && response.data.courses) {
        setCourses(response.data.courses)
      } else {
        console.error("Unexpected response format:", response.data)
        showNotification("Failed to load courses", "error")
      }
    } catch (error) {
      console.error("Error loading courses:", error)
      showNotification("Error loading courses", "error")
    } finally {
      setCoursesLoading(false)
    }
  }

  const loadMaterials = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: 12,
        ...filters,
      })
      
      const response = await api.get(`/api/materials?${queryParams}`)
      
      if (response.data && response.data.materials) {
        setMaterials(response.data.materials)
        setTotalPages(response.data.totalPages)
      } else {
        console.error("Unexpected response format:", response.data)
        showNotification("Error loading materials", "error")
      }
    } catch (error) {
      console.error("Error loading materials:", error)
      showNotification("Error loading materials", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!uploadForm.file) {
      showNotification("Please select a file", "error")
      return
    }
    
    setUploading(true)
    const formData = new FormData()
    formData.append("title", uploadForm.title)
    formData.append("description", uploadForm.description)
    formData.append("course", uploadForm.course)
    formData.append("file", uploadForm.file)
    
    try {
      const response = await api.post("/api/materials/upload", formData)
      
      if (response.data && response.data.success) {
        showNotification("Material uploaded successfully! It is now pending admin approval.", "success")
        setUploadModalOpen(false)
        setUploadForm({ title: "", description: "", course: "", file: null })
        loadMaterials()
      } else {
        throw new Error(response.data?.message || "Upload failed")
      }
    } catch (error) {
      console.error("Error uploading material:", error)
      showNotification(error.response?.data?.message || "Error uploading material", "error")
    } finally {
      setUploading(false)
    }
  }
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
    setFilters({ search: "", course: "", type: "" })
    setCurrentPage(1)
  }

  const getFileIcon = (filename) => {
    const extension = filename.split(".").pop().toLowerCase()
    const iconMap = {
      pdf: "fa-file-pdf",
      doc: "fa-file-word",
      docx: "fa-file-word",
      ppt: "fa-file-powerpoint",
      pptx: "fa-file-powerpoint",
    }
    return iconMap[extension] || "fa-file"
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
    notification.className = `notification ${type}`
    
    // Add icon based on type
    const icon = type === "success" ? "fa-check-circle" : "fa-exclamation-circle"
    
    notification.innerHTML = `
      <i class="fas ${icon}"></i>
      <span>${message}</span>
    `
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 12px;
      color: white;
      z-index: 1000;
      background: ${type === "success" ? "linear-gradient(45deg, #10b981, #059669)" : "linear-gradient(45deg, #ef4444, #dc2626)"};
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 600;
      max-width: 400px;
    `
    
    document.body.appendChild(notification)
    
    // Add animation
    setTimeout(() => {
      notification.style.animation = "slideInRight 0.4s ease forwards"
    }, 10)
    
    setTimeout(() => {
      notification.style.animation = "slideOutRight 0.3s ease forwards"
      setTimeout(() => notification.remove(), 300)
    }, 3000)
  }

  const goBack = () => {
    window.history.back()
  }

  return (
    <div className={styles.materialsPage}>
      <div className={styles.materialsHeader}>
        <button className={styles.backBtn} onClick={goBack}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className={styles.headerContent}>
          <h1>Study Materials</h1>
          <p>Upload and access course materials</p>
        </div>
        <button 
          className={`${styles.uploadBtn} ${uploading ? styles.loading : ''}`} 
          onClick={() => setUploadModalOpen(true)}
          disabled={uploading}
        >
          <i className="fas fa-plus"></i>
          {uploading ? 'Uploading...' : 'Upload Material'}
        </button>
      </div>
      
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
            disabled={coursesLoading}
          >
            <option value="">{coursesLoading ? "Loading courses..." : "All Courses"}</option>
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
      
      {loading ? (
        <div className={styles.loading}>
          <i className="fas fa-spinner"></i>
          <span>Loading materials...</span>
        </div>
      ) : materials.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="fas fa-folder-open"></i>
          <h3>No materials found</h3>
          <p>Try adjusting your filters or upload new materials</p>
        </div>
      ) : (
        <div className={styles.materialsGrid}>
          {materials.map((material) => (
            <div key={material._id} className={styles.materialCard}>
              <div className={styles.materialIcon}>
                <i className={`fas ${getFileIcon(material.originalName)}`}></i>
              </div>
              <div className={styles.materialInfo}>
                <div className={styles.materialHeader}>
                  <h3 className={styles.materialTitle}>{material.title}</h3>
                  <div className={styles.materialMeta}>
                    <span className={styles.materialCourse}>
                      {material.course?.courseCode || material.course?.courseName || "Unknown"}
                    </span>
                    <span className={styles.materialSize}>{formatFileSize(material.fileSize)}</span>
                  </div>
                </div>
                <div className={styles.materialDetails}>
                  <span className={styles.uploader}>{material.uploadedBy?.fullName || "Unknown"}</span>
                  <span className={styles.uploadDate}>{new Date(material.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className={styles.materialActions}>
                <button
                  onClick={() => downloadMaterial(material._id, material.originalName)}
                  className={styles.downloadBtn}
                >
                  <i className="fas fa-download"></i>
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={styles.pageBtn}
          >
            <i className="fas fa-chevron-left"></i>
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
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      )}
      
      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setUploadModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Upload Material</h2>
              <button onClick={() => setUploadModalOpen(false)} className={styles.closeBtn}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleUpload} className={styles.uploadForm}>
              <div className={styles.formGroup}>
                <label>Title</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows="3"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Course</label>
                <select
                  value={uploadForm.course}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, course: e.target.value }))}
                  required
                  disabled={coursesLoading}
                >
                  <option value="">{coursesLoading ? "Loading courses..." : "Select Course"}</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.courseName} ({course.courseCode})
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>File</label>
                <input
                  type="file"
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, file: e.target.files[0] }))}
                  accept=".pdf,.docx,.ppt"
                  required
                />
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.submitBtn} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button type="button" onClick={() => setUploadModalOpen(false)} className={styles.cancelBtn}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Materials