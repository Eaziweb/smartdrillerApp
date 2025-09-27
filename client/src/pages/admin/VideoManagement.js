"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import styles from "../../styles/VideoManagement.module.css"
import api from "../../utils/api";

const VideoManagement = () => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [showTopicModal, setShowTopicModal] = useState(false)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [openCourseId, setOpenCourseId] = useState(null)
  const [courseForm, setCourseForm] = useState({ 
    title: "", 
    description: "",
    isVisible: true 
  })
  const [topicForm, setTopicForm] = useState({ title: "", description: "" })
  const [videoForm, setVideoForm] = useState({
    title: "",
    description: "",
    url: "",
  })
  
  // Get authorization token
  const getAuthHeader = () => {
    const token = localStorage.getItem("token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      const response = await api.get("/api/admin/videos/courses", {
        headers: getAuthHeader(),
      })
      
      // Ensure response.data is an array
      if (Array.isArray(response.data)) {
        setCourses(response.data);
      } else if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data.courses)) {
          setCourses(response.data.courses);
        } else {
          console.error("Unexpected response format:", response.data);
          setCourses([]);
        }
      } else {
        console.error("Response data is not an array:", response.data);
        setCourses([]);
      }
    } catch (error) {
      console.error("Failed to load courses:", error)
      showToast("Failed to load courses", "error")
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCourse = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await api.put(`/api/admin/videos/courses/${editingItem._id}`, courseForm, {
          headers: getAuthHeader(),
        })
      } else {
        await api.post("/api/admin/videos/courses", courseForm, {
          headers: getAuthHeader(),
        })
      }
      setCourseForm({ title: "", description: "", isVisible: true })
      setShowCourseModal(false)
      setEditingItem(null)
      loadCourses()
      showToast(editingItem ? "Course updated successfully!" : "Course created successfully!")
    } catch (error) {
      console.error("Failed to save course:", error)
      showToast(error.response?.data?.message || "Failed to save course", "error")
    }
  }

  const handleCreateTopic = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await api.put(`/api/admin/videos/topics/${editingItem._id}`, topicForm, {
          headers: getAuthHeader(),
        })
      } else {
        await api.post(`/api/admin/videos/courses/${selectedCourse._id}/topics`, topicForm, {
          headers: getAuthHeader(),
        })
      }
      setTopicForm({ title: "", description: "" })
      setShowTopicModal(false)
      setEditingItem(null)
      loadCourses()
      showToast(editingItem ? "Topic updated successfully!" : "Topic created successfully!")
    } catch (error) {
      console.error("Failed to save topic:", error)
      showToast(error.response?.data?.message || "Failed to save topic", "error")
    }
  }

  const handleCreateVideo = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await api.put(`/api/admin/videos/${editingItem._id}`, videoForm, {
          headers: getAuthHeader(),
        })
      } else {
        await api.post(`/api/admin/videos/topics/${selectedTopic._id}/videos`, videoForm, {
          headers: getAuthHeader(),
        })
      }
      setVideoForm({ title: "", description: "", url: "" })
      setShowVideoModal(false)
      setEditingItem(null)
      loadCourses()
      showToast(editingItem ? "Video updated successfully!" : "Video created successfully!")
    } catch (error) {
      console.error("Failed to save video:", error)
      showToast(error.response?.data?.message || "Failed to save video", "error")
    }
  }

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm("Are you sure you want to delete this video?")) return
    try {
      await api.delete(`/api/admin/videos/${videoId}`, {
        headers: getAuthHeader(),
      })
      loadCourses()
      showToast("Video deleted successfully!")
    } catch (error) {
      console.error("Failed to delete video:", error)
      showToast(error.response?.data?.message || "Failed to delete video", "error")
    }
  }

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm("Are you sure you want to delete this topic and all its videos?")) return
    try {
      await api.delete(`/api/admin/videos/topics/${topicId}`, {
        headers: getAuthHeader(),
      })
      loadCourses()
      showToast("Topic deleted successfully!")
    } catch (error) {
      console.error("Failed to delete topic:", error)
      showToast(error.response?.data?.message || "Failed to delete topic", "error")
    }
  }

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm("Are you sure you want to delete this course and all its content?")) return
    try {
      await api.delete(`/api/admin/videos/courses/${courseId}`, {
        headers: getAuthHeader(),
      })
      loadCourses()
      showToast("Course deleted successfully!")
    } catch (error) {
      console.error("Failed to delete course:", error)
      showToast(error.response?.data?.message || "Failed to delete course", "error")
    }
  }

  const toggleCourseVisibility = async (course) => {
    try {
      await api.put(`/api/admin/videos/courses/${course._id}/visibility`, {}, {
        headers: getAuthHeader(),
      })
      loadCourses()
      showToast(`Course ${course.isVisible ? 'hidden' : 'shown'} successfully!`)
    } catch (error) {
      console.error("Failed to toggle course visibility:", error)
      showToast(error.response?.data?.message || "Failed to toggle course visibility", "error")
    }
  }

  const refreshVideoMetadata = async (videoId) => {
    try {
      await api.post(`/api/admin/videos/${videoId}/refresh-metadata`, {}, {
        headers: getAuthHeader(),
      })
      loadCourses()
      showToast("Video metadata refreshed successfully!")
    } catch (error) {
      console.error("Failed to refresh video metadata:", error)
      showToast(error.response?.data?.message || "Failed to refresh video metadata", "error")
    }
  }

  const openEditCourse = (course) => {
    setEditingItem(course)
    setCourseForm({ 
      title: course.title, 
      description: course.description,
      isVisible: course.isVisible
    })
    setShowCourseModal(true)
  }

  const openEditTopic = (topic) => {
    setEditingItem(topic)
    setTopicForm({ title: topic.title, description: topic.description })
    setShowTopicModal(true)
  }

  const openEditVideo = (video) => {
    setEditingItem(video)
    setVideoForm({ 
      title: video.title, 
      description: video.description, 
      url: video.url
    })
    setShowVideoModal(true)
  }

  const toggleCourse = (courseId) => {
    // If the clicked course is already open, close it
    if (openCourseId === courseId) {
      setOpenCourseId(null)
    } else {
      // Otherwise, open the clicked course and close any other open course
      setOpenCourseId(courseId)
    }
  }

  const getYouTubeVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toString()
  }

  const showToast = (message, type = "success") => {
    const toast = document.createElement("div")
    toast.className = `${styles.toast} ${styles[`toast${type.charAt(0).toUpperCase() + type.slice(1)}`]}`
    toast.innerHTML = `
      <i class="fas ${type === "success" ? "fa-check-circle" : "fa-exclamation-triangle"}"></i>
      <span>${message}</span>
    `
    document.body.appendChild(toast)
    setTimeout(() => toast.classList.add(styles.show), 100)
    setTimeout(() => {
      toast.classList.remove(styles.show)
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast)
        }
      }, 300)
    }, 3000)
  }

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
            <i className="fas fa-plus"></i>
            Add Course
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
              <i className="fas fa-plus"></i>
              Add Course
            </button>
          </div>
        ) : (
          courses.map((course) => (
            <div key={course._id} className={styles.courseSection}>
              <div 
                className={`${styles.courseHeader} ${openCourseId === course._id ? styles.active : ''}`}
                onClick={() => toggleCourse(course._id)}
              >
                <div className={styles.courseInfo}>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                  <div className={styles.courseMeta}>
                    <span className={styles.itemCount}>{Array.isArray(course.topics) ? course.topics.length : 0} topics</span>
                    <span className={`${styles.visibilityBadge} ${course.isVisible ? styles.visible : styles.hidden}`}>
                      <i className={`fas ${course.isVisible ? "fa-eye" : "fa-eye-slash"}`}></i>
                      {course.isVisible ? "Visible" : "Hidden"}
                    </span>
                  </div>
                </div>
                <div className={styles.courseActions}>
                  <button
                    className={`${styles.btn} ${styles.btnSm} ${styles.btnSecondary}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCourse(course)
                      setShowTopicModal(true)
                    }}
                  >
                    <i className="fas fa-plus"></i>
                    Add Topic
                  </button>
                  <button 
                    className={`${styles.btn} ${styles.btnSm} ${course.isVisible ? styles.btnSuccess : styles.btnWarning}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCourseVisibility(course)
                    }}
                    title={course.isVisible ? "Hide from users" : "Show to users"}
                  >
                    <i className={`fas ${course.isVisible ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                  <button 
                    className={`${styles.btn} ${styles.btnSm} ${styles.btnOutline}`} 
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditCourse(course)
                    }}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button 
                    className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`} 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCourse(course._id)
                    }}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              
              {/* Only show course content if this course is open */}
              {openCourseId === course._id && (
                <div className={styles.courseContent}>
                  {!Array.isArray(course.topics) || course.topics.length === 0 ? (
                    <div className={styles.emptySection}>
                      <p>No topics in this course</p>
                      <button
                        className={`${styles.btn} ${styles.btnSm} ${styles.btnSecondary}`}
                        onClick={() => {
                          setSelectedCourse(course)
                          setShowTopicModal(true)
                        }}
                      >
                        <i className="fas fa-plus"></i>
                        Add Topic
                      </button>
                    </div>
                  ) : (
                    course.topics.map((topic) => (
                      <div key={topic._id} className={styles.topicSection}>
                        <div className={styles.topicHeader}>
                          <div className={styles.topicInfo}>
                            <h4>{topic.title}</h4>
                            <p>{topic.description}</p>
                            <span className={styles.itemCount}>{Array.isArray(topic.videos) ? topic.videos.length : 0} videos</span>
                          </div>
                          <div className={styles.topicActions}>
                            <button
                              className={`${styles.btn} ${styles.btnSm} ${styles.btnSecondary}`}
                              onClick={() => {
                                setSelectedTopic(topic)
                                setShowVideoModal(true)
                              }}
                            >
                              <i className="fas fa-plus"></i>
                              Add Video
                            </button>
                            <button className={`${styles.btn} ${styles.btnSm} ${styles.btnOutline}`} onClick={() => openEditTopic(topic)}>
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`} onClick={() => handleDeleteTopic(topic._id)}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                        
                        {!Array.isArray(topic.videos) || topic.videos.length === 0 ? (
                          <div className={styles.emptySection}>
                            <p>No videos in this topic</p>
                            <button
                              className={`${styles.btn} ${styles.btnSm} ${styles.btnSecondary}`}
                              onClick={() => {
                                setSelectedTopic(topic)
                                setShowVideoModal(true)
                              }}
                            >
                              <i className="fas fa-plus"></i>
                              Add Video
                            </button>
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
                                      <i className="fas fa-eye"></i> {formatNumber(video.views || 0)} views
                                    </span>
                                    <span className={styles.videoLikes}>
                                      <i className="fas fa-thumbs-up"></i> {formatNumber(video.likes || 0)} likes
                                    </span>
                                  </div>
                                </div>
                                <div className={styles.videoActions}>
                                  <button className={`${styles.btn} ${styles.btnSm} ${styles.btnOutline}`} onClick={() => openEditVideo(video)}>
                                    <i className="fas fa-edit"></i>
                                  </button>
                                  <button className={`${styles.btn} ${styles.btnSm} ${styles.btnSecondary}`} onClick={() => refreshVideoMetadata(video._id)}>
                                    <i className="fas fa-sync-alt"></i>
                                  </button>
                                  <button className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`} onClick={() => handleDeleteVideo(video._id)}>
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Course Modal */}
      {showCourseModal && (
        <div className={styles.modal}>
          <div
            className={styles.modalBackdrop}
            onClick={() => {
              setShowCourseModal(false)
              setEditingItem(null)
              setCourseForm({ title: "", description: "", isVisible: true })
            }}
          ></div>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{editingItem ? "Edit Course" : "Add New Course"}</h3>
              <button
                className={styles.closeBtn}
                onClick={() => {
                  setShowCourseModal(false)
                  setEditingItem(null)
                  setCourseForm({ title: "", description: "", isVisible: true })
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreateCourse} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Course Title</label>
                <input
                  type="text"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={courseForm.isVisible}
                    onChange={(e) => setCourseForm({ ...courseForm, isVisible: e.target.checked })}
                  />
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
      
      {/* Topic Modal */}
      {showTopicModal && (
        <div className={styles.modal}>
          <div
            className={styles.modalBackdrop}
            onClick={() => {
              setShowTopicModal(false)
              setEditingItem(null)
              setTopicForm({ title: "", description: "" })
            }}
          ></div>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{editingItem ? "Edit Topic" : "Add New Topic"}</h3>
              <button
                className={styles.closeBtn}
                onClick={() => {
                  setShowTopicModal(false)
                  setEditingItem(null)
                  setTopicForm({ title: "", description: "" })
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreateTopic} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Topic Title</label>
                <input
                  type="text"
                  value={topicForm.title}
                  onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={topicForm.description}
                  onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                  rows="3"
                />
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
      
      {/* Video Modal */}
      {showVideoModal && (
        <div className={styles.modal}>
          <div
            className={styles.modalBackdrop}
            onClick={() => {
              setShowVideoModal(false)
              setEditingItem(null)
              setVideoForm({ title: "", description: "", url: "" })
            }}
          ></div>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{editingItem ? "Edit Video" : "Add New Video"}</h3>
              <button
                className={styles.closeBtn}
                onClick={() => {
                  setShowVideoModal(false)
                  setEditingItem(null)
                  setVideoForm({ title: "", description: "", url: "" })
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreateVideo} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Video Title</label>
                <input
                  type="text"
                  value={videoForm.title}
                  onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Video URL (YouTube)</label>
                <input
                  type="url"
                  value={videoForm.url}
                  onChange={(e) => setVideoForm({ ...videoForm, url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={videoForm.description}
                  onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                  rows="3"
                />
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
    </div>
  )
}

export default VideoManagement