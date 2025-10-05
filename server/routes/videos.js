const express = require("express")
const router = express.Router()
const { auth } = require("../middleware/auth")
const subscriptionCheck = require("../middleware/subscriptionCheck")
const VideoCourse = require("../models/VideoCourse")
const VideoTopic = require("../models/VideoTopic")
const Video = require("../models/Video")
const UserProgress = require("../models/UserProgress")

// routes/videos.js

// Get all courses with topics (for user)
router.get("/courses", auth, async (req, res) => {
  try {
    const courses = await VideoCourse.find({ isVisible: true })
      .populate({
        path: "topics",
        select: "title description videoCount",
        options: { sort: { createdAt: 1 } },
      })
      .sort({ createdAt: 1 })
    res.json(courses)
  } catch (error) {
    console.error("Error fetching video courses:", error)
    res.status(500).json({ message: "Server error" })
  }
})

router.get("/topic/:topicId", auth, subscriptionCheck, async (req, res) => {
  try {
    const { topicId } = req.params
    const videos = await Video.find({ topic: topicId })
      .sort({ createdAt: 1 })
      .select("title description url duration views likes createdAt")
    res.json(videos)
  } catch (error) {
    console.error("Error fetching topic videos:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update video progress
router.post("/progress/:videoId", auth, subscriptionCheck, async (req, res) => {
  try {
    const { videoId } = req.params
    const { progress } = req.body
    const userId = req.user._id

    let userProgress = await UserProgress.findOne({ user: userId })

    if (!userProgress) {
      userProgress = new UserProgress({ user: userId, videoProgress: [] })
    }

    const existingProgress = userProgress.videoProgress.find((p) => p.video.toString() === videoId)

    if (existingProgress) {
      existingProgress.progress = Math.max(existingProgress.progress, progress)
      existingProgress.lastWatched = new Date()
    } else {
      userProgress.videoProgress.push({
        video: videoId,
        progress,
        lastWatched: new Date(),
      })
    }

    await userProgress.save()
    res.json({ message: "Progress updated successfully" })
  } catch (error) {
    console.error("Error updating video progress:", error)
    res.status(500).json({ message: "Server error" })
  }
})


module.exports = router
