"use client"
import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/Materials.module.css"

const Materials = () => {
  const { user } = useAuth()
  const [materials, setMaterials] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)
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
    try {
      const response = await fetch("/api/materials/courses", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        setCourses(data.courses)
      }
    } catch (error) {
      console.error("Error loading courses:", error)
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
      const response = await fetch(`/api/materials?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        setMaterials(data.materials)
        setTotalPages(data.totalPages)
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
    const formData = new FormData()
    formData.append("title", uploadForm.title)
    formData.append("description", uploadForm.description)
    formData.append("course", uploadForm.course)
    formData.append("file", uploadForm.file)
    try {
      const response = await fetch("/api/materials/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      })
      const data = await response.json()
      if (data.success) {
        showNotification("Material uploaded successfully!", "success")
        setUploadModalOpen(false)
        setUploadForm({ title: "", description: "", course: "", file: null })
        loadMaterials()
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error("Error uploading material:", error)
      showNotification("Error uploading material", "error")
    }
  }

  const downloadMaterial = async (materialId, title) => {
    try {
      const response = await fetch(`/api/materials/${materialId}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = title
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        showNotification("Download started", "success")
      } else {
        throw new Error("Download failed")
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

  const getFileIcon = (filename) => {
    const extension = filename.split(".").pop().toLowerCase()
    const iconMap = {
      pdf: "fa-file-pdf",
      doc: "fa-file-word",
      docx: "fa-file-word",
      ppt: "fa-file-powerpoint",
      pptx: "fa-file-powerpoint",
      mp4: "fa-file-video",
      mp3: "fa-file-audio",
      txt: "fa-file-text",
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
    notification.textContent = message
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      z-index: 1000;
      background: ${type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#3b82f6"};
    `
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 3000)
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
        <button className={styles.uploadBtn} onClick={() => setUploadModalOpen(true)}>
          <i className="fas fa-plus"></i>
          Upload
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
          >
            <option value="">All Courses</option>
            {courses.map((course) => (
              <option key={course._id} value={course._id}>
                {course.name} ({course.code})
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
      
      {loading ? (
        <div className={styles.loading}>Loading materials...</div>
      ) : (
        <div className={styles.materialsGrid}>
          {materials.map((material) => (
            <div key={material._id} className={styles.materialCard}>
              <div className={styles.materialIcon}>
                <i className={`fas ${getFileIcon(material.filename)}`}></i>
              </div>
              <div className={styles.materialInfo}>
                <h3 className={styles.materialTitle}>{material.title}</h3>
                <p className={styles.materialDescription}>{material.description}</p>
                <div className={styles.materialMeta}>
                  {/* Always show course code if available, otherwise show course name, otherwise show "Unknown" */}
                  <span className={styles.materialCourse}>
                    {material.courseCode || material.courseName || "Unknown"}
                  </span>
                  <span className={styles.materialSize}>{formatFileSize(material.fileSize)}</span>
                </div>
                <div className={styles.materialStats}>
                  <span className={styles.uploader}>By: {material.uploaderName}</span>
                  <span className={styles.uploadDate}>{new Date(material.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className={styles.materialActions}>
                <button onClick={() => downloadMaterial(material._id, material.filename)} className={styles.downloadBtn}>
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
                >
                  <option value="">Select Course</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.name} ({course.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>File</label>
                <input
                  type="file"
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, file: e.target.files[0] }))}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mp3,.txt"
                  required
                />
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.submitBtn}>
                  Upload
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