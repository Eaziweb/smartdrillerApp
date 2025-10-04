"use client"
import { useState, useEffect, useCallback } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import api from "../../utils/api"
import styles from "../../styles/Videos.module.css"

const Videos = () => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewStyle, setViewStyle] = useState(() => {
    return localStorage.getItem("videoViewStyle") || "grid"
  })
  const [openCourse, setOpenCourse] = useState(null)
  const [openTopic, setOpenTopic] = useState(null)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [error, setError] = useState(null)
  const [topicVideos, setTopicVideos] = useState({}) // Cache for topic videos
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadCourses()
  }, [])

  useEffect(() => {
    localStorage.setItem("videoViewStyle", viewStyle)
  }, [viewStyle])

  const loadCourses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get("/api/videos/courses", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      setCourses(response.data)
    } catch (error) {
      console.error("Failed to load courses:", error)
      setError("Failed to load courses. Please try again later.")
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleCourse = useCallback((courseId) => {
    if (!user?.isSubscribed) {
      navigate("/subscription-required")
      return
    }
    
    setOpenCourse(openCourse === courseId ? null : courseId)
    setOpenTopic(null)
  }, [openCourse, user, navigate])

  const toggleTopic = useCallback(async (topicId) => {
    if (!user?.isSubscribed) {
      navigate("/subscription-required")
      return
    }
    
    if (openTopic === topicId) {
      setOpenTopic(null)
      return
    }
    
    // Check if videos are already cached
    if (topicVideos[topicId]) {
      setOpenTopic(topicId)
      return
    }
    
    setOpenTopic(topicId)
    try {
      const response = await api.get(`/api/videos/topic/${topicId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      // Cache the videos for this topic
      setTopicVideos(prev => ({
        ...prev,
        [topicId]: response.data
      }))
    } catch (error) {
      console.error("Failed to load videos:", error)
    }
  }, [openTopic, topicVideos, user, navigate])

  const openVideoPlayer = useCallback((video) => {
    if (!user?.isSubscribed) {
      navigate("/subscription-required")
      return
    }
    
    setSelectedVideo(video)
  }, [user, navigate])

  const closeVideoPlayer = useCallback(() => {
    setSelectedVideo(null)
  }, [])

  const getYouTubeVideoId = useCallback((url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }, [])

  const formatNumber = useCallback((num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toString()
  }, [])

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.topics && course.topics.some((topic) => 
        topic.title.toLowerCase().includes(searchTerm.toLowerCase())
      )),
  )

  // Detect if device is mobile
  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  if (loading) {
    return (
      <div className={styles.videosPage}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Loading videos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.videosPage}>
        <div className={styles.errorContainer}>
          <i className="fas fa-exclamation-triangle"></i>
          <h2>Error Loading Videos</h2>
          <p>{error}</p>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={loadCourses}>
            <i className="fas fa-redo"></i>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.videosPage}>
      <header className={styles.videosHeader}>
        <div className={styles.headerContent}>
          <Link to="/home" className={styles.backBtn}>
            <i className="fas fa-arrow-left"></i>
          </Link>
          <h1>Video Library</h1>
          <div className={styles.headerActions}>
            <button
              className={`${styles.viewToggle} ${viewStyle === "grid" ? styles.active : ""}`}
              onClick={() => setViewStyle("grid")}
              title="Grid View"
            >
              <i className="fas fa-th-large"></i>
            </button>
            <button
              className={`${styles.viewToggle} ${viewStyle === "list" ? styles.active : ""}`}
              onClick={() => setViewStyle("list")}
              title="List View"
            >
              <i className="fas fa-list"></i>
            </button>
          </div>
        </div>
      </header>
      
      {/* Subscription banner for unsubscribed users */}
      {!user?.isSubscribed && (
        <div className={styles.subscriptionBanner}>
          <div className={styles.bannerContent}>
            <i className="fas fa-lock"></i>
            <p>Subscribe to access our full video library</p>
            <button 
              className={styles.subscribeBtn}
              onClick={() => navigate("/subscription-required")}
            >
              Subscribe Now
            </button>
          </div>
        </div>
      )}
      
      <div className={styles.searchSection}>
        <div className={styles.searchBar}>
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search courses or topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className={styles.clearSearch} onClick={() => setSearchTerm("")}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      </div>
      
      <div className={`${styles.coursesContainer} ${viewStyle}`}>
        {courses.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="fas fa-video"></i>
            <h2>No courses available</h2>
            <p>There are no video courses available at the moment.</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className={styles.noResults}>
            <i className="fas fa-search"></i>
            <p>No videos found matching your search</p>
          </div>
        ) : (
          filteredCourses.map((course) => (
            <div key={course._id} className={styles.courseItem}>
              <div 
                className={`${styles.courseHeader} ${!user?.isSubscribed ? styles.disabled : ''}`} 
                onClick={() => toggleCourse(course._id)}
              >
                <div className={styles.courseInfo}>
                  <h3>{course.title}</h3>
                  <span className={styles.topicCount}>
                    <i className="fas fa-folder"></i>
                    {course.topics?.length || 0} topics
                  </span>
                </div>
                <div className={styles.courseHeaderActions}>
                  {!user?.isSubscribed && (
                    <i className={`fas fa-lock ${styles.lockIcon}`}></i>
                  )}
                  <i className={`${styles.courseChevron} fas fa-chevron-${openCourse === course._id ? "up" : "down"}`}></i>
                </div>
              </div>
              
              {openCourse === course._id && (
                <div className={styles.topicsContainer}>
                  {course.topics && course.topics.length > 0 ? (
                    course.topics.map((topic) => (
                      <div key={topic._id} className={styles.topicItem}>
                        <div 
                          className={`${styles.topicHeader} ${!user?.isSubscribed ? styles.disabled : ''}`} 
                          onClick={() => toggleTopic(topic._id)}
                        >
                          <div className={styles.topicInfo}>
                            <h4>{topic.title}</h4>
                            <span className={styles.videoCount}>
                              <i className="fas fa-video"></i>
                              {topic.videoCount || 0} videos
                            </span>
                          </div>
                          <div className={styles.topicHeaderActions}>
                            {!user?.isSubscribed && (
                              <i className={`fas fa-lock ${styles.lockIcon}`}></i>
                            )}
                            <i className={`${styles.topicChevron} fas fa-chevron-${openTopic === topic._id ? "up" : "down"}`}></i>
                          </div>
                        </div>
                        
                        {openTopic === topic._id && (
                          <div className={viewStyle === "grid" ? styles.videosGrid : styles.videosList}>
                            {(topicVideos[topic._id] || []).map((video) => (
                              <div 
                                key={video._id} 
                                className={`${styles.videoCard} ${!user?.isSubscribed ? styles.disabledVideoCard : ''}`} 
                                onClick={() => openVideoPlayer(video)}
                              >
                                <div className={styles.videoThumbnail}>
                                  <img
                                    src={`https://img.youtube.com/vi/${getYouTubeVideoId(video.url)}/maxresdefault.jpg`}
                                    alt={video.title}
                                    onError={(e) => {
                                      e.target.src = `https://img.youtube.com/vi/${getYouTubeVideoId(video.url)}/hqdefault.jpg`
                                    }}
                                  />
                                  <div className={styles.playOverlay}>
                                    <div className={styles.playButton}>
                                      {!user?.isSubscribed ? (
                                        <i className="fas fa-lock"></i>
                                      ) : (
                                        <i className="fas fa-play"></i>
                                      )}
                                    </div>
                                  </div>
                                  <div className={styles.videoDuration}>
                                    <i className="fas fa-clock"></i>
                                    <span>{video.duration || "0:00"}</span>
                                  </div>
                                </div>
                                <div className={styles.videoInfo}>
                                  <h5>{video.title}</h5>
                                  <p>{video.description}</p>
                                  <div className={styles.videoMeta}>
                                    <span className={styles.videoViews}>
                                      <i className="fas fa-eye"></i> {formatNumber(video.views || 0)} views
                                    </span>
                                    <span className={styles.videoDate}>
                                      <i className="fas fa-calendar"></i> {new Date(video.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptySection}>
                      <p>No topics in this course</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Only show video modal for subscribed users */}
      {user?.isSubscribed && selectedVideo && (
        <div className={styles.videoModal}>
          <div className={styles.modalBackdrop} onClick={closeVideoPlayer}></div>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{selectedVideo.title}</h3>
              <button className={styles.closeBtn} onClick={closeVideoPlayer}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.videoPlayerContainer}>
                <div className={styles.videoPlayer}>
                  <iframe
                    src={`https://www.youtube.com/embed/${getYouTubeVideoId(selectedVideo.url)}?rel=0&showinfo=0&modestbranding=1${isMobile ? '&autoplay=0' : '&autoplay=1'}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={selectedVideo.title}
                  ></iframe>
                </div>
              </div>
              <div className={styles.videoDetails}>
                <h4 className={styles.videoTitle}>{selectedVideo.title}</h4>
                <p className={styles.videoDescription}>{selectedVideo.description}</p>
                <div className={styles.videoStats}>
                  <div className={styles.statItem}>
                    <i className="fas fa-eye"></i>
                    <span>{formatNumber(selectedVideo.views || 0)} views</span>
                  </div>
                  <div className={styles.statItem}>
                    <i className="fas fa-calendar"></i>
                    <span>{new Date(selectedVideo.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.statItem}>
                    <i className="fas fa-thumbs-up"></i>
                    <span>{formatNumber(selectedVideo.likes || 0)} likes</span>
                  </div>
                  <div className={styles.statItem}>
                    <i className="fas fa-clock"></i>
                    <span>{selectedVideo.duration || "0:00"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Videos