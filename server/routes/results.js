const express = require("express")
const Result = require("../models/Result")
const { auth } = require("../middleware/auth")

const router = express.Router()

// Submit mock result
router.post("/submit", auth, async (req, res) => {
  try {
    if (!req.user.isSubscribed) {
      return res.status(403).json({ message: "Subscription required" })
    }

    const {
      course,
      year,
      topics,
      totalQuestions,
      timeAllowed,
      timeUsed,
      questions, // Array of { questionId, selectedOption, isCorrect }
    } = req.body

    // Calculate stats
    const answeredQuestions = questions.filter((q) => q.selectedOption > 0).length
    const correctAnswers = questions.filter((q) => q.isCorrect).length
    const wrongAnswers = answeredQuestions - correctAnswers
    const unansweredQuestions = totalQuestions - answeredQuestions
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

    // Calculate grade
    let grade = "F"
    if (percentage >= 90) grade = "A"
    else if (percentage >= 80) grade = "B"
    else if (percentage >= 70) grade = "C"
    else if (percentage >= 60) grade = "D"
    else if (percentage >= 50) grade = "E"

    const result = new Result({
      user: req.user._id,
      examType: "mock",
      course,
      year,
      topics: Array.isArray(topics) ? topics : topics.split(","),
      totalQuestions,
      answeredQuestions,
      correctAnswers,
      wrongAnswers,
      unansweredQuestions,
      score: correctAnswers,
      percentage,
      grade,
      timeAllowed,
      timeUsed,
      questions,
    })

    await result.save()

    res.status(201).json({
      message: "Result submitted successfully",
      result: {
        _id: result._id,
        percentage,
        grade,
        correctAnswers,
        wrongAnswers,
        unansweredQuestions,
        totalQuestions,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get user results history
router.get("/history", auth, async (req, res) => {
  try {
    if (!req.user.isSubscribed) {
      return res.status(403).json({ message: "Subscription required" })
    }

    const { page = 1, limit = 20 } = req.query

    const skip = (page - 1) * limit
    const results = await Result.find({ user: req.user._id })
      .select("-questions") // Exclude detailed questions for list view
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await Result.countDocuments({ user: req.user._id })

    // Calculate stats
    const totalQuizzes = total
    const averageScore =
      results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length) : 0
    const bestScore = results.length > 0 ? Math.max(...results.map((r) => r.percentage)) : 0

    res.json({
      results,
      stats: {
        totalQuizzes,
        averageScore,
        bestScore,
      },
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

// Get specific result with questions (for correction view)
router.get("/:id", auth, async (req, res) => {
  try {
    if (!req.user.isSubscribed) {
      return res.status(403).json({ message: "Subscription required" })
    }

    const result = await Result.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("questions.questionId")

    if (!result) {
      return res.status(404).json({ message: "Result not found" })
    }

    res.json(result)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
