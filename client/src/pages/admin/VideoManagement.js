"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import styles from "../../styles/VideoManagement.module.css"
import api from "../../utils/api"

const VideoManagement = () => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [showTopicModal, setShowTopicModal] = useState(false)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [openCourseId, setOpenCourseId] = useState(null)
  const [openTopicIds, setOpenTopicIds] = useState({}) // track which topics are open per course
  const [refreshingCourse, setRefreshingCourse] = useState(null) // courseId being refreshed
  const [bulkUrls, setBulkUrls] = useState("") // textarea of URLs
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResults, setBulkResults] = useState([]) // per-URL results

  const [courseForm, setCourseForm] = useState({ title: "", description: "", isVisible: true })
  const [topicForm, setTopicForm] = useState({ title: "", description: "" })
  const [videoForm, setVideoForm] = useState({ title: "", description: "", url: "" })

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      const response = await api.get("/api/admin/videos/courses")
      if (Array.isArray(response.data)) {
        setCourses(response.data)
      } else if (response.data && Array.isArray(response.data.courses)) {
        setCourses(response.data.courses)
      } else {
        setCourses([])
      }
    } catch (error) {
      console.error("Failed to load courses:", error)
      showToast("Failed to load courses", "error")
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  // ── CRUD handlers ───────────────────────────────────────

  const handleCreateCourse = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await api.put(`/api/admin/videos/courses/${editingItem._id}`, courseForm)
      } else {
        await api.post("/api/admin/videos/courses", courseForm)
      }
      setCourseForm({ title: "", description: "", isVisible: true })
      setShowCourseModal(false)
      setEditingItem(null)
      loadCourses()
      showToast(editingItem ? "Course updated!" : "Course created!")
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to save course", "error")
    }
  }

  const handleCreateTopic = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await api.put(`/api/admin/videos/topics/${editingItem._id}`, topicForm)
      } else {
        await api.post(`/api/admin/videos/courses/${selectedCourse._id}/topics`, topicForm)
      }
      setTopicForm({ title: "", description: "" })
      setShowTopicModal(false)
      setEditingItem(null)
      loadCourses()
      showToast(editingItem ? "Topic updated!" : "Topic created!")
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to save topic", "error")
    }
  }

  const handleCreateVideo = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await api.put(`/api/admin/videos/${editingItem._id}`, videoForm)
      } else {
        await api.post(`/api/admin/videos/topics/${selectedTopic._id}/videos`, videoForm)
      }
      setVideoForm({ title: "", description: "", url: "" })
      setShowVideoModal(false)
      setEditingItem(null)
      loadCourses()
      showToast(editingItem ? "Video updated!" : "Video added!")
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to save video", "error")
    }
  }

  // ── Bulk upload ─────────────────────────────────────────
  // Pastes many YouTube URLs (one per line) into a topic.
  // Topic name defaults to "General" if none exists yet.

  const handleBulkUpload = async () => {
    const urls = bulkUrls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean)

    if (urls.length === 0) {
      showToast("Please paste at least one URL", "error")
      return
    }

    setBulkLoading(true)
    setBulkResults([])

    const results = []

    for (const url of urls) {
      try {
        await api.post(`/api/admin/videos/topics/${selectedTopic._id}/videos`, {
          url,
          title: "",       // backend will use YouTube title
          description: "", // backend will use YouTube description
        })
        results.push({ url, status: "success" })
      } catch (err) {
        results.push({
          url,
          status: "error",
          message: err.response?.data?.message || "Failed",
        })
      }
    }

    setBulkResults(results)
    setBulkLoading(false)

    const successCount = results.filter((r) => r.status === "success").length
    showToast(`${successCount}/${urls.length} videos added successfully`)
    loadCourses()
  }

  // ── Refresh all videos in a course ─────────────────────

  const handleRefreshAllInCourse = async (course) => {
    const allVideos = []
    if (Array.isArray(course.topics)) {
      course.topics.forEach((topic) => {
        if (Array.isArray(topic.videos)) {
          topic.videos.forEach((v) => allVideos.push(v._id))
        }
      })
    }

    if (allVideos.length === 0) {
      showToast("No videos in this course to refresh", "error")
      return
    }

    setRefreshingCourse(course._id)
    let success = 0

    for (const videoId of allVideos) {
      try {
        await api.post(`/api/admin/videos/${videoId}/refresh-metadata`, {})
        success++
      } catch (_) {}
    }

    setRefreshingCourse(null)
    showToast(`Refreshed ${success}/${allVideos.length} videos`)
    loadCourses()
  }

  // ── Single video refresh ────────────────────────────────

  const refreshVideoMetadata = async (videoId) => {
    try {
      await api.post(`/api/admin/videos/${videoId}/refresh-metadata`, {})
      loadCourses()
      showToast("Metadata refreshed!")
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to refresh metadata", "error")
    }
  }

  // ── Delete handlers ─────────────────────────────────────

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm("Delete this video?")) return
    try {
      await api.delete(`/api/admin/videos/${videoId}`)
      loadCourses()
      showToast("Video deleted!")
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to delete video", "error")
    }
  }

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm("Delete this topic and all its videos?")) return
    try {
      await api.delete(`/api/admin/videos/topics/${topicId}`)
      loadCourses()
      showToast("Topic deleted!")
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to delete topic", "error")
    }
  }

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm("Delete this course and all its content?")) return
    try {
      await api.delete(`/api/admin/videos/courses/${courseId}`)
      loadCourses()
      showToast("Course deleted!")
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to delete course", "error")
    }
  }

  const toggleCourseVisibility = async (course) => {
    try {
      await api.put(`/api/admin/videos/courses/${course._id}/visibility`, {})
      loadCourses()
      showToast(`Course ${course.isVisible ? "hidden" : "shown"}!`)
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to toggle visibility", "error")
    }
  }

  // ── Edit openers ────────────────────────────────────────

  const openEditCourse = (course) => {
    setEditingItem(course)
    setCourseForm({ title: course.title, description: course.description, isVisible: course.isVisible })
    setShowCourseModal(true)
  }

  const openEditTopic = (topic) => {
    setEditingItem(topic)
    setTopicForm({ title: topic.title, description: topic.description })
    setShowTopicModal(true)
  }

  const openEditVideo = (video) => {
    setEditingItem(video)
    setVideoForm({ title: video.title, description: video.description, url: video.url })
    setShowVideoModal(true)
  }

  // ── Accordion toggles ───────────────────────────────────

  const toggleCourse = (courseId) => {
    setOpenCourseId((prev) => (prev === courseId ? null : courseId))
  }

  const toggleTopic = (courseId, topicId) => {
    setOpenTopicIds((prev) => ({
      ...prev,
      [`${courseId}-${topicId}`]: !prev[`${courseId}-${topicId}`],
    }))
  }

  // ── Helpers ─────────────────────────────────────────────

  const getYouTubeVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url?.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return (num || 0).toString()
  }

  const showToast = (message, type = "success") => {
    const toast = document.createElement("div")
    toast.className = `${styles.toast} ${styles[`toast${type.charAt(0).toUpperCase() + type.slice(1)}`]}`
    toast.innerHTML = `<i class="fas ${type === "success" ? "fa-check-circle" : "fa-exclamation-triangle"}"></i><span>${message}</span>`
    document.body.appendChild(toast)
    setTimeout(() => toast.classList.add(styles.show), 100)
    setTimeout(() => {
      toast.classList.remove(styles.show)
      setTimeout(() => document.body.contains(toast) && document.body.removeChild(toast), 300)
    }, 3000)
  }

  const openBulkModal = (topic) => {
    setSelectedTopic(topic)
    setBulkUrls("")
    setBulkResults([])
    setShowBulkModal(true)
  }

  // ── Render ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.videoManagement}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.videoManagement}>
      <header className={styles.managementHeader}>
        <div className={styles.headerContent}>
          <Link to="/admin/dashboard" className={styles.backBtn}>
            <i className="fas fa-arrow-left"></i>
          </Link>
          <h1>Video Management</h1>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowCourseModal(true)}>
            <i className="fas fa-plus"></i> Add Course
          </button>
        </div>
      </header>

      <div className={styles.managementContent}>
        {!Array.isArray(courses) || courses.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="fas fa-video"></i>
            <h2>No courses found</h2>
            <p>Create your first course to get started</p>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowCourseModal(true)}>
              <i className="fas fa-plus"></i> Add Course
            </button>
          </div>
        ) : (
          courses.map((course) => {
            const isCourseOpen = openCourseId === course._id
            const totalVideos = (course.topics || []).reduce(
              (acc, t) => acc + (t.videos?.length || 0), 0
            )

            return (
              <div key={course._id} className={styles.courseSection}>
                {/* Course Header */}
                <div
                  className={`${styles.courseHeader} ${isCourseOpen ? styles.active : ""}`}
                  onClick={() => toggleCourse(course._id)}
                >
                  <div className={styles.courseInfo}>
                    <h3>{course.title}</h3>
                    <p>{course.description}</p>
                    <div className={styles.courseMeta}>
                      <span className={styles.itemCount}>
                        {course.topics?.length || 0} topics · {totalVideos} videos
                      </span>
                      <span className={`${styles.visibilityBadge} ${course.isVisible ? styles.visible : styles.hidden}`}>
                        <i className={`fas ${course.isVisible ? "fa-eye" : "fa-eye-slash"}`}></i>
                        {course.isVisible ? "Visible" : "Hidden"}
                      </span>
                    </div>
                  </div>
                  <div className={styles.courseActions}>
                    {/* Refresh all videos in course */}
                    <button
                      className={`${styles.btn} ${styles.btnSm} ${styles.btnSecondary}`}
                      onClick={(e) => { e.stopPropagation(); handleRefreshAllInCourse(course) }}
                      disabled={refreshingCourse === course._id}
                      title="Refresh metadata for all videos in this course"
                    >
                      <i className={`fas fa-sync-alt ${refreshingCourse === course._id ? styles.spinning : ""}`}></i>
                      {refreshingCourse === course._id ? " Refreshing..." : " Refresh All"}
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnSm} ${styles.btnSecondary}`}
                      onClick={(e) => { e.stopPropagation(); setSelectedCourse(course); setShowTopicModal(true) }}
                    >
                      <i className="fas fa-plus"></i> Add Topic
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnSm} ${course.isVisible ? styles.btnSuccess : styles.btnWarning}`}
                      onClick={(e) => { e.stopPropagation(); toggleCourseVisibility(course) }}
                      title={course.isVisible ? "Hide from users" : "Show to users"}
                    >
                      <i className={`fas ${course.isVisible ? "fa-eye-slash" : "fa-eye"}`}></i>
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnSm} ${styles.btnOutline}`}
                      onClick={(e) => { e.stopPropagation(); openEditCourse(course) }}
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`}
                      onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course._id) }}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>

                {/* Course Content */}
                <div className={`${styles.courseContent} ${isCourseOpen ? styles.active : ""}`}>
                  <div className={styles.courseContentInner}>
                    {!course.topics?.length ? (
                      <div className={styles.emptySection}>
                        <p>No topics in this course</p>
                        <button
                          className={`${styles.btn} ${styles.btnSm} ${styles.btnSecondary}`}
                          onClick={() => { setSelectedCourse(course); setShowTopicModal(true) }}
                        >
                          <i className="fas fa-plus"></i> Add Topic
                        </button>
                      </div>
                    ) : (
                      course.topics.map((topic) => {
                        const isTopicOpen = !!openTopicIds[`${course._id}-${topic._id}`]

                        return (
                          <div key={topic._id} className={styles.topicSection}>
                            {/* Topic Header — clickable to toggle */}
                            <div
                              className={`${styles.topicHeader} ${isTopicOpen ? styles.active : ""}`}
                              onClick={() => toggleTopic(course._id, topic._id)}
                              style={{ cursor: "pointer" }}
                            >
                              <div className={styles.topicInfo}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  <i className={`fas fa-chevron-${isTopicOpen ? "down" : "right"}`}
                                    style={{ fontSize: "0.75rem", opacity: 0.6 }}
                                  ></i>
                                  <h4>{topic.title}</h4>
                                </div>
                                {topic.description && <p>{topic.description}</p>}
                                <span className={styles.itemCount}>
                                  {topic.videos?.length || 0} videos
                                </span>
                              </div>
                              <div className={styles.topicActions} onClick={(e) => e.stopPropagation()}>
                                {/* Bulk upload */}
                                <button
                                  className={`${styles.btn} ${styles.btnSm} ${styles.btnSecondary}`}
                                  onClick={() => openBulkModal(topic)}
                                  title="Bulk upload YouTube URLs"
                                >
                                  <i className="fas fa-upload"></i> Bulk Add
                                </button>
                                {/* Single video */}
                                <button
                                  className={`${styles.btn} ${styles.btnSm} ${styles.btnSecondary}`}
                                  onClick={() => { setSelectedTopic(topic); setShowVideoModal(true) }}
                                >
                                  <i className="fas fa-plus"></i> Add Video
                                </button>
                                <button
                                  className={`${styles.btn} ${styles.btnSm} ${styles.btnOutline}`}
                                  onClick={() => openEditTopic(topic)}
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button
                                  className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`}
                                  onClick={() => handleDeleteTopic(topic._id)}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </div>

                            {/* Topic Videos — shown only when topic is open */}
                            {isTopicOpen && (
                              <div className={styles.topicContent}>
                                {!topic.videos?.length ? (
                                  <div className={styles.emptySection}>
                                    <p>No videos in this topic</p>
                                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                                      <button
                                        className={`${styles.btn} ${styles.btnSm} ${styles.btnSecondary}`}
                                        onClick={() => openBulkModal(topic)}
                                      >
                                        <i className="fas fa-upload"></i> Bulk Add
                                      </button>
                                      <button
                                        className={`${styles.btn} ${styles.btnSm} ${styles.btnSecondary}`}
                                        onClick={() => { setSelectedTopic(topic); setShowVideoModal(true) }}
                                      >
                                        <i className="fas fa-plus"></i> Add Video
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className={styles.videosGrid}>
                                    {topic.videos.map((video) => (
                                      <div key={video._id} className={styles.videoItem}>
                                        <div className={styles.videoThumbnail}>
                                          <img
                                            src={`https://img.youtube.com/vi/${getYouTubeVideoId(video.url)}/hqdefault.jpg`}
                                            alt={video.title}
                                          />
                                          <div className={styles.videoDuration}>
                                            <i className="fas fa-clock"></i>
                                            <span>{video.duration || "0:00"}</span>
                                          </div>
                                        </div>
                                        <div className={styles.videoInfo}>
                                          <h5>{video.title}</h5>
                                          <p>{video.description}</p>
                                          <div className={styles.videoStats}>
                                            <span className={styles.videoViews}>
                                              <i className="fas fa-eye"></i> {formatNumber(video.views)} views
                                            </span>
                                            <span className={styles.videoLikes}>
                                              <i className="fas fa-thumbs-up"></i> {formatNumber(video.likes)} likes
                                            </span>
                                          </div>
                                        </div>
                                        <div className={styles.videoActions}>
                                          <button
                                            className={`${styles.btn} ${styles.btnSm} ${styles.btnOutline}`}
                                            onClick={() => openEditVideo(video)}
                                          >
                                            <i className="fas fa-edit"></i>
                                          </button>
                                          <button
                                            className={`${styles.btn} ${styles.btnSm} ${styles.btnSecondary}`}
                                            onClick={() => refreshVideoMetadata(video._id)}
                                            title="Refresh metadata"
                                          >
                                            <i className="fas fa-sync-alt"></i>
                                          </button>
                                          <button
                                            className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`}
                                            onClick={() => handleDeleteVideo(video._id)}
                                          >
                                            <i className="fas fa-trash"></i>
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Course Modal ── */}
      {showCourseModal && (
        <div className={styles.modal}>
          <div className={styles.modalBackdrop} onClick={() => { setShowCourseModal(false); setEditingItem(null); setCourseForm({ title: "", description: "", isVisible: true }) }}></div>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{editingItem ? "Edit Course" : "Add New Course"}</h3>
              <button className={styles.closeBtn} onClick={() => { setShowCourseModal(false); setEditingItem(null); setCourseForm({ title: "", description: "", isVisible: true }) }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreateCourse} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Course Title</label>
                <input type="text" value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} required />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} rows="3" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={courseForm.isVisible} onChange={(e) => setCourseForm({ ...courseForm, isVisible: e.target.checked })} />
                  <span>Visible to users</span>
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  {editingItem ? "Update Course" : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Topic Modal ── */}
      {showTopicModal && (
        <div className={styles.modal}>
          <div className={styles.modalBackdrop} onClick={() => { setShowTopicModal(false); setEditingItem(null); setTopicForm({ title: "", description: "" }) }}></div>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{editingItem ? "Edit Topic" : "Add New Topic"}</h3>
              <button className={styles.closeBtn} onClick={() => { setShowTopicModal(false); setEditingItem(null); setTopicForm({ title: "", description: "" }) }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreateTopic} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Topic Title</label>
                <input type="text" value={topicForm.title} onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })} required />
              </div>
              <div className={styles.formGroup}>
                <label>Description (Optional)</label>
                <textarea value={topicForm.description} onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })} rows="3" />
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  {editingItem ? "Update Topic" : "Create Topic"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Single Video Modal ── */}
      {showVideoModal && (
        <div className={styles.modal}>
          <div className={styles.modalBackdrop} onClick={() => { setShowVideoModal(false); setEditingItem(null); setVideoForm({ title: "", description: "", url: "" }) }}></div>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{editingItem ? "Edit Video" : "Add Video"}</h3>
              <button className={styles.closeBtn} onClick={() => { setShowVideoModal(false); setEditingItem(null); setVideoForm({ title: "", description: "", url: "" }) }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreateVideo} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>YouTube URL *</label>
                <input type="url" value={videoForm.url} onChange={(e) => setVideoForm({ ...videoForm, url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." required />
              </div>
              <div className={styles.formGroup}>
                <label>Title (Optional — will use YouTube title)</label>
                <input type="text" value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })} placeholder="Leave blank to auto-fill from YouTube" />
              </div>
              <div className={styles.formGroup}>
                <label>Description (Optional)</label>
                <textarea value={videoForm.description} onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })} rows="3" placeholder="Leave blank to auto-fill from YouTube" />
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  {editingItem ? "Update Video" : "Add Video"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Upload Modal ── */}
      {showBulkModal && (
        <div className={styles.modal}>
          <div className={styles.modalBackdrop} onClick={() => { if (!bulkLoading) { setShowBulkModal(false); setBulkResults([]) } }}></div>
          <div className={styles.modalContent} style={{ maxWidth: "560px" }}>
            <div className={styles.modalHeader}>
              <h3>
                <i className="fas fa-upload" style={{ marginRight: "0.5rem" }}></i>
                Bulk Add Videos
                {selectedTopic && (
                  <span style={{ fontSize: "0.85rem", fontWeight: "normal", opacity: 0.7, marginLeft: "0.5rem" }}>
                    → {selectedTopic.title}
                  </span>
                )}
              </h3>
              <button className={styles.closeBtn} onClick={() => { if (!bulkLoading) { setShowBulkModal(false); setBulkResults([]) } }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>
                  Paste YouTube URLs — one per line
                </label>
                <textarea
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  rows="10"
                  placeholder={`https://www.youtube.com/watch?v=abc123\nhttps://youtu.be/def456\nhttps://www.youtube.com/watch?v=ghi789`}
                  disabled={bulkLoading}
                  style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                />
                <small style={{ opacity: 0.6 }}>
                  {bulkUrls.split("\n").filter((u) => u.trim()).length} URLs detected.
                  Titles and descriptions will be pulled from YouTube automatically.
                </small>
              </div>

              {/* Results */}
              {bulkResults.length > 0 && (
                <div style={{ maxHeight: "200px", overflowY: "auto", marginBottom: "1rem" }}>
                  {bulkResults.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                        padding: "0.4rem 0",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        fontSize: "0.8rem",
                      }}
                    >
                      <i
                        className={`fas ${r.status === "success" ? "fa-check-circle" : "fa-times-circle"}`}
                        style={{ color: r.status === "success" ? "#22c55e" : "#ef4444", marginTop: "2px", flexShrink: 0 }}
                      ></i>
                      <div style={{ wordBreak: "break-all" }}>
                        <span style={{ opacity: 0.7 }}>{r.url}</span>
                        {r.message && <div style={{ color: "#ef4444" }}>{r.message}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={handleBulkUpload}
                  disabled={bulkLoading}
                >
                  {bulkLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Uploading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload"></i> Upload All
                    </>
                  )}
                </button>
                {bulkResults.length > 0 && (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnOutline}`}
                    onClick={() => { setShowBulkModal(false); setBulkResults([]) }}
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoManagement