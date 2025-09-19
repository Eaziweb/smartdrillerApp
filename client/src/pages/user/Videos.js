"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
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

  useEffect(() => {
    loadCourses()
  }, [])

  useEffect(() => {
    localStorage.setItem("videoViewStyle", viewStyle)
  }, [viewStyle])

  const loadCourses = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get("/api/videos/courses", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      setCourses(response.data)
    } catch (error) {
      console.error("Failed to load courses:", error)
      setError("Failed to load courses. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const toggleCourse = (courseId) => {
    setOpenCourse(openCourse === courseId ? null : courseId)
    setOpenTopic(null)
  }

  const toggleTopic = async (topicId) => {
    if (openTopic === topicId) {
      setOpenTopic(null)
      return
    }
    setOpenTopic(topicId)
    // Lazy load videos for this topic
    try {
      const response = await axios.get(`/api/videos/topic/${topicId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      setCourses((prevCourses) =>
        prevCourses.map((course) => ({
          ...course,
          topics: course.topics.map((topic) => (topic._id === topicId ? { ...topic, videos: response.data } : topic)),
        })),
      )
    } catch (error) {
      console.error("Failed to load videos:", error)
    }
  }

  const openVideoPlayer = (video) => {
    setSelectedVideo(video)
  }

  const closeVideoPlayer = () => {
    setSelectedVideo(null)
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

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.topics && course.topics.some((topic) => 
        topic.title.toLowerCase().includes(searchTerm.toLowerCase())
      )),
  )

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
              <div className={styles.courseHeader} onClick={() => toggleCourse(course._id)}>
                <div className={styles.courseInfo}>
                  <h3>{course.title}</h3>
                  <span className={styles.topicCount}>
                    <i className="fas fa-folder"></i>
                    {course.topics?.length || 0} topics
                  </span>
                </div>
                <i className={`${styles.courseChevron} fas fa-chevron-${openCourse === course._id ? "up" : "down"}`}></i>
              </div>
              
              {openCourse === course._id && (
                <div className={styles.topicsContainer}>
                  {course.topics && course.topics.length > 0 ? (
                    course.topics.map((topic) => (
                      <div key={topic._id} className={styles.topicItem}>
                        <div className={styles.topicHeader} onClick={() => toggleTopic(topic._id)}>
                          <div className={styles.topicInfo}>
                            <h4>{topic.title}</h4>
                            <span className={styles.videoCount}>
                              <i className="fas fa-video"></i>
                              {topic.videoCount || 0} videos
                            </span>
                          </div>
                          <i className={`${styles.topicChevron} fas fa-chevron-${openTopic === topic._id ? "up" : "down"}`}></i>
                        </div>
                        
                        {openTopic === topic._id && topic.videos && (
                          <div className={viewStyle === "grid" ? styles.videosGrid : styles.videosList}>
                            {topic.videos.map((video) => (
                              <div key={video._id} className={styles.videoCard} onClick={() => openVideoPlayer(video)}>
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
                                      <i className="fas fa-play"></i>
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
      
      {selectedVideo && (
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
              <div className={styles.videoPlayer}>
                <iframe
                  width="100%"
                  height="400"
                  src={`https://www.youtube.com/embed/${getYouTubeVideoId(selectedVideo.url)}?autoplay=1`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className={styles.videoDetails}>
                <p>{selectedVideo.description}</p>
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