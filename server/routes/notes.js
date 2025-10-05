// routes/notes.js
const express = require("express")
const router = express.Router()
const { auth } = require("../middleware/auth")
const subscriptionCheck = require("../middleware/subscriptionCheck")
const NoteCourse = require("../models/NoteCourse")
const Note = require("../models/Note")
const UserProgress = require("../models/UserProgress")
const mongoose = require("mongoose")

router.get("/courses", auth, async (req, res) => {
  try {
    const courses = await NoteCourse.find({ isVisible: true })
      .populate({
        path: "notes",
        select: "title description createdAt",
        options: { sort: { createdAt: 1 } },
      })
      .sort({ createdAt: 1 })
    res.json(courses)
  } catch (error) {
    console.error("Error fetching note courses:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get user progress - MUST come before dynamic routes
router.get("/progress", auth, subscriptionCheck, async (req, res) => {
  try {
    const userId = req.user._id
    let userProgress = await UserProgress.findOne({ user: userId })
    
    if (!userProgress) {
      userProgress = new UserProgress({ 
        user: userId, 
        completedNotes: [],
        videoProgress: []
      })
      await userProgress.save()
    }
    
    res.json({ completedNotes: userProgress.completedNotes })
  } catch (error) {
    console.error("Error fetching user progress:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get a specific note - Dynamic route must come after static routes
router.get("/:noteId", auth, async (req, res) => {
  try {
    const { noteId } = req.params
    const note = await Note.findById(noteId).populate("course", "title")
    if (!note) {
      return res.status(404).json({ message: "Note not found" })
    }
    res.json(note)
  } catch (error) {
    console.error("Error fetching note:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Mark note as completed
router.post("/:noteId/complete", auth, subscriptionCheck, async (req, res) => {
  try {
    const { noteId } = req.params
    const userId = req.user._id
    
    // First, verify the note exists
    const note = await Note.findById(noteId)
    if (!note) {
      return res.status(404).json({ message: "Note not found" })
    }
    
    let userProgress = await UserProgress.findOne({ user: userId })
    
    if (!userProgress) {
      userProgress = new UserProgress({ 
        user: userId, 
        completedNotes: [new mongoose.Types.ObjectId(noteId)], // Fixed: added 'new' keyword
        videoProgress: []
      })
    } else {
      // Check if note is already in completedNotes
      const noteObjectId = new mongoose.Types.ObjectId(noteId) // Fixed: added 'new' keyword
      if (!userProgress.completedNotes.some(id => id.toString() === noteObjectId.toString())) {
        userProgress.completedNotes.push(noteObjectId)
      }
    }
    
    await userProgress.save()
    res.json({ message: "Note marked as completed" })
  } catch (error) {
    console.error("Error marking note as completed:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router