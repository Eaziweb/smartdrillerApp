const express = require("express")
const Bookmark = require("../models/Bookmark")
const Question = require("../models/Question")
const { auth } = require("../middleware/auth")

const router = express.Router()

// Get user bookmarks by course
router.get("/", auth, async (req, res) => {
  try {
    if (!req.user.isSubscribed) {
      return res.status(403).json({ message: "Subscription required" })
    }

    const { course, page = 1, limit = 20 } = req.query

    const query = { user: req.user._id }
    if (course) {
      query.course = course
    }

    const skip = (page - 1) * limit
    const bookmarks = await Bookmark.find(query)
      .populate("question")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await Bookmark.countDocuments(query)

    // Group by course if no specific course requested
    let result
    if (!course) {
      const groupedBookmarks = {}
      bookmarks.forEach((bookmark) => {
        const courseCode = bookmark.course
        if (!groupedBookmarks[courseCode]) {
          groupedBookmarks[courseCode] = []
        }
        groupedBookmarks[courseCode].push(bookmark)
      })
      result = groupedBookmarks
    } else {
      result = bookmarks
    }

    res.json({
      bookmarks: result,
      pagination: {
        current: Number.parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Add bookmark
router.post("/add", auth, async (req, res) => {
  try {
    if (!req.user.isSubscribed) {
      return res.status(403).json({ message: "Subscription required" })
    }

    const { questionId } = req.body

    // Get question to get course info
    const question = await Question.findById(questionId)
    if (!question) {
      return res.status(404).json({ message: "Question not found" })
    }

    // Check if already bookmarked
    const existing = await Bookmark.findOne({
      user: req.user._id,
      question: questionId,
    })

    if (existing) {
      return res.status(400).json({ message: "Question already bookmarked" })
    }

    const bookmark = new Bookmark({
      user: req.user._id,
      question: questionId,
      course: question.course,
    })

    await bookmark.save()

    res.status(201).json({
      message: "Question bookmarked successfully",
      bookmark,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Remove bookmark
router.delete("/:questionId", auth, async (req, res) => {
  try {
    const { questionId } = req.params

    const bookmark = await Bookmark.findOneAndDelete({
      user: req.user._id,
      question: questionId,
    })

    if (!bookmark) {
      return res.status(404).json({ message: "Bookmark not found" })
    }

    res.json({ message: "Bookmark removed successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Check if question is bookmarked
router.get("/check/:questionId", auth, async (req, res) => {
  try {
    const { questionId } = req.params

    const bookmark = await Bookmark.findOne({
      user: req.user._id,
      question: questionId,
    })

    res.json({ isBookmarked: !!bookmark })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
