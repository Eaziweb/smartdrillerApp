const express = require("express")
const router = express.Router()
const { adminAuth } = require("../middleware/auth")
const VideoCourse = require("../models/VideoCourse")
const VideoTopic = require("../models/VideoTopic")
const Video = require("../models/Video")
const youtubeService = require("../utils/youtubeService")

// Helper: extract YouTube video ID from URL
const getYouTubeVideoId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url?.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

// ─────────────────────────────────────────────
// COURSES
// ─────────────────────────────────────────────

// Get all courses with topics and videos (admin)
router.get("/courses", adminAuth, async (req, res) => {
  try {
    const courses = await VideoCourse.find()
      .populate({
        path: "topics",
        populate: {
          path: "videos",
          select: "title description url duration views likes createdAt lastMetadataUpdate",
        },
      })
      .sort({ createdAt: 1 })

    res.json(courses)
  } catch (error) {
    console.error("Error fetching video courses:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create course
router.post("/courses", adminAuth, async (req, res) => {
  try {
    const { title, description } = req.body
    const course = new VideoCourse({ title, description })
    await course.save()
    res.status(201).json(course)
  } catch (error) {
    console.error("Error creating video course:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update course
router.put("/courses/:courseId", adminAuth, async (req, res) => {
  try {
    const { title, description, isVisible } = req.body
    const course = await VideoCourse.findByIdAndUpdate(
      req.params.courseId,
      { title, description, isVisible },
      { new: true }
    )
    if (!course) return res.status(404).json({ message: "Course not found" })
    res.json(course)
  } catch (error) {
    console.error("Error updating video course:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Toggle course visibility
router.put("/courses/:courseId/visibility", adminAuth, async (req, res) => {
  try {
    const course = await VideoCourse.findById(req.params.courseId)
    if (!course) return res.status(404).json({ message: "Course not found" })
    course.isVisible = !course.isVisible
    await course.save()
    res.json({ message: `Course ${course.isVisible ? "shown" : "hidden"} successfully`, isVisible: course.isVisible })
  } catch (error) {
    console.error("Error toggling course visibility:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete course (cascades to topics and videos)
router.delete("/courses/:courseId", adminAuth, async (req, res) => {
  try {
    const { courseId } = req.params
    const topics = await VideoTopic.find({ course: courseId })
    for (const topic of topics) {
      await Video.deleteMany({ topic: topic._id })
    }
    await VideoTopic.deleteMany({ course: courseId })
    await VideoCourse.findByIdAndDelete(courseId)
    res.json({ message: "Course deleted successfully" })
  } catch (error) {
    console.error("Error deleting video course:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// ─────────────────────────────────────────────
// REFRESH ALL VIDEOS IN A COURSE
// ─────────────────────────────────────────────
// Iterates every topic → every video and refreshes YouTube metadata.
// Returns a summary of successes and failures.

router.post("/courses/:courseId/refresh-all", adminAuth, async (req, res) => {
  try {
    const { courseId } = req.params

    const topics = await VideoTopic.find({ course: courseId }).populate("videos")
    const allVideos = topics.flatMap((t) => t.videos || [])

    if (allVideos.length === 0) {
      return res.json({ message: "No videos to refresh", refreshed: 0, failed: 0 })
    }

    let refreshed = 0
    let failed = 0
    const errors = []

    for (const video of allVideos) {
      const videoId = getYouTubeVideoId(video.url)
      if (!videoId) { failed++; errors.push({ id: video._id, reason: "Invalid URL" }); continue }

      try {
        const metadata = await youtubeService.getVideoMetadata(videoId)
        await Video.findByIdAndUpdate(video._id, {
          title: metadata.title,
          description: metadata.description,
          duration: metadata.duration,
          views: metadata.views,
          likes: metadata.likes,
          lastMetadataUpdate: new Date(),
        })
        refreshed++
      } catch (err) {
        failed++
        errors.push({ id: video._id, reason: err.message })
      }
    }

    res.json({ message: `Refreshed ${refreshed}/${allVideos.length} videos`, refreshed, failed, errors })
  } catch (error) {
    console.error("Error refreshing all videos in course:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// ─────────────────────────────────────────────
// TOPICS
// ─────────────────────────────────────────────

// Create topic
router.post("/courses/:courseId/topics", adminAuth, async (req, res) => {
  try {
    const { courseId } = req.params
    const { title, description } = req.body

    const topic = new VideoTopic({
      title: title || "General",
      description: description || "",
      course: courseId,
    })

    await topic.save()
    await VideoCourse.findByIdAndUpdate(courseId, { $push: { topics: topic._id } })
    res.status(201).json(topic)
  } catch (error) {
    console.error("Error creating video topic:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update topic
router.put("/topics/:topicId", adminAuth, async (req, res) => {
  try {
    const { title, description } = req.body
    const topic = await VideoTopic.findByIdAndUpdate(
      req.params.topicId,
      { title, description },
      { new: true }
    )
    if (!topic) return res.status(404).json({ message: "Topic not found" })
    res.json(topic)
  } catch (error) {
    console.error("Error updating video topic:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete topic (cascades to videos)
router.delete("/topics/:topicId", adminAuth, async (req, res) => {
  try {
    const topic = await VideoTopic.findById(req.params.topicId)
    if (!topic) return res.status(404).json({ message: "Topic not found" })
    await Video.deleteMany({ topic: req.params.topicId })
    await VideoCourse.findByIdAndUpdate(topic.course, { $pull: { topics: req.params.topicId } })
    await VideoTopic.findByIdAndDelete(req.params.topicId)
    res.json({ message: "Topic deleted successfully" })
  } catch (error) {
    console.error("Error deleting video topic:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// ─────────────────────────────────────────────
// VIDEOS
// ─────────────────────────────────────────────

// Create video — title/description optional; falls back to YouTube metadata
router.post("/topics/:topicId/videos", adminAuth, async (req, res) => {
  try {
    const { topicId } = req.params
    const { title, description, url } = req.body

    const topic = await VideoTopic.findById(topicId)
    if (!topic) return res.status(404).json({ message: "Topic not found" })

    const videoId = getYouTubeVideoId(url)
    if (!videoId) return res.status(400).json({ message: "Invalid YouTube URL" })

    let metadata
    try {
      metadata = await youtubeService.getVideoMetadata(videoId)
    } catch (error) {
      return res.status(400).json({ message: "Failed to fetch video metadata from YouTube" })
    }

    const video = new Video({
      title: title?.trim() || metadata.title,
      description: description?.trim() || metadata.description,
      url,
      duration: metadata.duration,
      views: metadata.views,
      likes: metadata.likes,
      topic: topicId,
      course: topic.course,
      lastMetadataUpdate: new Date(),
    })

    await video.save()
    await VideoTopic.findByIdAndUpdate(topicId, {
      $push: { videos: video._id },
      $inc: { videoCount: 1 },
    })

    res.status(201).json(video)
  } catch (error) {
    console.error("Error creating video:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update video
router.put("/:videoId", adminAuth, async (req, res) => {
  try {
    const { title, description, url } = req.body
    let metadata = {}

    if (url) {
      const videoId = getYouTubeVideoId(url)
      if (!videoId) return res.status(400).json({ message: "Invalid YouTube URL" })
      try {
        metadata = await youtubeService.getVideoMetadata(videoId)
      } catch (error) {
        return res.status(400).json({ message: "Failed to fetch video metadata from YouTube" })
      }
    }

    const updateData = {
      ...(url && { url }),
      title: title?.trim() || metadata.title,
      description: description?.trim() || metadata.description,
      ...(metadata.duration && { duration: metadata.duration }),
      ...(metadata.views !== undefined && { views: metadata.views }),
      ...(metadata.likes !== undefined && { likes: metadata.likes }),
      lastMetadataUpdate: new Date(),
    }

    const video = await Video.findByIdAndUpdate(req.params.videoId, updateData, { new: true })
    if (!video) return res.status(404).json({ message: "Video not found" })
    res.json(video)
  } catch (error) {
    console.error("Error updating video:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete video
router.delete("/:videoId", adminAuth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId)
    if (!video) return res.status(404).json({ message: "Video not found" })
    await VideoTopic.findByIdAndUpdate(video.topic, {
      $pull: { videos: req.params.videoId },
      $inc: { videoCount: -1 },
    })
    await Video.findByIdAndDelete(req.params.videoId)
    res.json({ message: "Video deleted successfully" })
  } catch (error) {
    console.error("Error deleting video:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Refresh single video metadata
router.post("/:videoId/refresh-metadata", adminAuth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId)
    if (!video) return res.status(404).json({ message: "Video not found" })

    const videoId = getYouTubeVideoId(video.url)
    if (!videoId) return res.status(400).json({ message: "Invalid YouTube URL" })

    const metadata = await youtubeService.getVideoMetadata(videoId)
    await Video.findByIdAndUpdate(req.params.videoId, {
      title: metadata.title,
      description: metadata.description,
      duration: metadata.duration,
      views: metadata.views,
      likes: metadata.likes,
      lastMetadataUpdate: new Date(),
    })

    res.json({ message: "Video metadata refreshed successfully" })
  } catch (error) {
    console.error("Error refreshing video metadata:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router