// routes/competitions.js (Backend)
const express = require("express")
const Competition = require("../models/Competition")
const CompetitionQuestion = require("../models/CompetitionQuestion")
const CompetitionSubmission = require("../models/CompetitionSubmission")
const User = require("../models/User")
const { auth } = require("../middleware/auth")
const { adminAuth } = require("../middleware/auth")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const router = express.Router()

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/competition-images/"
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, "competition-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"))
    }
  },
})

// Get all competitions (public)
router.get("/", auth, async (req, res) => {
  try {
    // First update statuses in bulk for efficiency
    const now = new Date()
    
    // Update competitions that should be active but aren't
    await Competition.updateMany(
      {
        startDate: { $lte: now },
        endDate: { $gte: now },
        status: { $ne: "active" }
      },
      { status: "active" }
    )
    
    // Update competitions that should be ended but aren't
    await Competition.updateMany(
      {
        endDate: { $lt: now },
        status: { $ne: "ended" }
      },
      { status: "ended" }
    )
    
    // Update competitions that are not started and are incorrectly marked as active or ended
    await Competition.updateMany(
      {
        startDate: { $gt: now },
        status: { $in: ["active", "ended"] }
      },
      { status: "upcoming" }
    )
    
    // Now fetch competitions with populated data
    const competitions = await Competition.find()
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 })
    
    res.json(competitions)
  } catch (error) {
    console.error("Error fetching competitions:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get single competition
router.get("/:id", auth, async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id)
      .populate("createdBy", "fullName")
    
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" })
    }
    
    // Update status manually
    const now = new Date()
    if (now < competition.startDate) {
      competition.status = "upcoming"
    } else if (now >= competition.startDate && now <= competition.endDate) {
      competition.status = "active"
    } else {
      competition.status = "ended"
    }
    await competition.save()
    
    // Ensure requiredCourses has a value
    if (competition.requiredCourses === undefined || competition.requiredCourses === null) {
      competition.requiredCourses = 1
      await competition.save()
    }
    
    res.json(competition)
  } catch (error) {
    console.error("Error fetching competition:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Check if user has already participated
router.get("/:id/participation", auth, async (req, res) => {
  try {
    const submission = await CompetitionSubmission.findOne({
      competitionId: req.params.id,
      userId: req.user._id,
    })
    res.json({ hasParticipated: !!submission, submission })
  } catch (error) {
    console.error("Error checking participation:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get competition questions for selected courses
router.post("/:id/questions", auth, async (req, res) => {
  try {
    const { selectedCourses } = req.body
    const competition = await Competition.findById(req.params.id)
    
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" })
    }
    
    if (competition.status !== "active") {
      return res.status(400).json({ message: "Competition is not active" })
    }
    
    // Check if user already participated
    const existingSubmission = await CompetitionSubmission.findOne({
      competitionId: req.params.id,
      userId: req.user._id,
    })
    
    if (existingSubmission) {
      return res.status(400).json({ message: "You have already participated in this competition" })
    }
    
    // Ensure requiredCourses has a value
    const requiredCourses = competition.requiredCourses || 1
    
    // Validate selected courses
    if (selectedCourses.length !== requiredCourses) {
      return res.status(400).json({
        message: `You must select exactly ${requiredCourses} courses`,
      })
    }
    
    let allQuestions = []
    let totalTime = 0
    
    for (const courseCode of selectedCourses) {
      const courseConfig = competition.courses.find((c) => c.courseCode === courseCode)
      if (!courseConfig) {
        return res.status(400).json({ message: `Invalid course: ${courseCode}` })
      }
      
      // Validate course configuration
      if (!courseConfig.questionsToShow || courseConfig.questionsToShow <= 0) {
        return res.status(400).json({ 
          message: `Invalid course configuration for: ${courseCode}. Questions to show must be greater than 0` 
        })
      }
      
      if (!courseConfig.timeAllowed || courseConfig.timeAllowed <= 0) {
        return res.status(400).json({ 
          message: `Invalid course configuration for: ${courseCode}. Time allowed must be greater than 0` 
        })
      }
      
      // Get random questions for this course
      const questions = await CompetitionQuestion.aggregate([
        {
          $match: {
            competitionId: competition._id,
            courseCode: courseCode,
          },
        },
        { $sample: { size: courseConfig.questionsToShow } },
      ])
      
      // If we don't have enough questions, get all available
      if (questions.length < courseConfig.questionsToShow) {
        const allAvailableQuestions = await CompetitionQuestion.find({
          competitionId: competition._id,
          courseCode: courseCode,
        })
        
        if (allAvailableQuestions.length === 0) {
          return res.status(400).json({ 
            message: `No questions available for course: ${courseCode}` 
          })
        }
        
        // Use all available questions if we don't have enough
        allQuestions = allQuestions.concat(allAvailableQuestions)
      } else {
        allQuestions = allQuestions.concat(questions)
      }
      
      totalTime += courseConfig.timeAllowed
    }
    
    // Shuffle all questions
    allQuestions = allQuestions.sort(() => Math.random() - 0.5)
    
    res.json({
      questions: allQuestions,
      totalTime,
      competition: {
        id: competition._id,
        name: competition.name,
        selectedCourses,
      },
    })
  } catch (error) {
    console.error("Error getting competition questions:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Submit competition answers
router.post("/:id/submit", auth, async (req, res) => {
  try {
    const { selectedCourses, answers, timeUsed, totalTime } = req.body
    const competition = await Competition.findById(req.params.id)
    
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" })
    }
    
    // Check if user already participated
    const existingSubmission = await CompetitionSubmission.findOne({
      competitionId: req.params.id,
      userId: req.user._id,
    })
    
    if (existingSubmission) {
      return res.status(400).json({ message: "You have already participated in this competition" })
    }
    
    // Check if submission is within grace period for ended competitions
    const now = new Date()
    const isGraceSubmission =
      now > competition.endDate && now <= new Date(competition.endDate.getTime() + competition.graceMinutes * 60000)
    
    if (competition.status === "ended" && !isGraceSubmission) {
      return res.status(400).json({ message: "Competition has ended" })
    }
    
    // Get all questions to validate answers
    const questionIds = answers.map((a) => a.questionId)
    const questions = await CompetitionQuestion.find({
      _id: { $in: questionIds },
      competitionId: competition._id,
    })
    
    // Calculate scores
    let correctAnswers = 0
    const courseScores = {}
    
    const processedAnswers = answers.map((answer) => {
      const question = questions.find((q) => q._id.toString() === answer.questionId)
      const isCorrect = question && answer.selectedOption === question.correctOption
      
      if (isCorrect) {
        correctAnswers++
        if (!courseScores[question.courseCode]) {
          courseScores[question.courseCode] = {
            courseCode: question.courseCode,
            courseName:
              competition.courses.find((c) => c.courseCode === question.courseCode)?.courseName || question.courseCode,
            totalQuestions: 0,
            correctAnswers: 0,
          }
        }
        courseScores[question.courseCode].correctAnswers++
      }
      
      if (question) {
        if (!courseScores[question.courseCode]) {
          courseScores[question.courseCode] = {
            courseCode: question.courseCode,
            courseName:
              competition.courses.find((c) => c.courseCode === question.courseCode)?.courseName || question.courseCode,
            totalQuestions: 0,
            correctAnswers: 0,
          }
        }
        courseScores[question.courseCode].totalQuestions++
      }
      
      return {
        questionId: answer.questionId,
        selectedOption: answer.selectedOption,
        isCorrect,
        courseCode: question?.courseCode || "",
      }
    })
    
    // Calculate course scores as percentages
    const courseScoreArray = Object.values(courseScores).map((course) => ({
      ...course,
      score: course.totalQuestions > 0 ? Math.round((course.correctAnswers / course.totalQuestions) * 100) : 0,
    }))
    
    const totalScore = answers.length > 0 ? Math.round((correctAnswers / answers.length) * 100) : 0
    
    // Create submission
    const submission = new CompetitionSubmission({
      competitionId: competition._id,
      userId: req.user._id,
      selectedCourses: selectedCourses.map((courseCode) => ({
        courseCode,
        courseName: competition.courses.find((c) => c.courseCode === courseCode)?.courseName || courseCode,
      })),
      answers: processedAnswers,
      totalQuestions: answers.length,
      correctAnswers,
      totalScore,
      courseScores: courseScoreArray,
      timeUsed,
      timeAllowed: totalTime,
      isGraceSubmission,
    })
    
    await submission.save()
    
    // Update competition participant count
    await Competition.findByIdAndUpdate(competition._id, {
      $inc: { totalParticipants: 1 },
    })
    
    res.json({
      message: "Competition submitted successfully",
      submission: {
        totalScore,
        correctAnswers,
        totalQuestions: answers.length,
        courseScores: courseScoreArray,
      },
    })
  } catch (error) {
    console.error("Error submitting competition:", error)
    res.status(500).json({ message: "Server error" })
  }
})
// routes/competitions.js

// Update the leaderboard route
// routes/competitions.js

// Update the leaderboard route
router.get("/:id/leaderboard", auth, async (req, res) => {
  try {
    const { course, sortBy = "score", page = 1, limit = 50 } = req.query
    const competition = await Competition.findById(req.params.id)

    if (!competition) {
      return res.status(404).json({ message: "Competition not found" })
    }

    // Check if leaderboard is available
    const now = new Date()
    const leaderboardAvailable = now >= new Date(
      competition.endDate.getTime() + competition.leaderboardDelay * 60000
    )

    if (!leaderboardAvailable && req.user.role !== "admin") {
      const availableAt = new Date(
        competition.endDate.getTime() + competition.leaderboardDelay * 60000
      )
      return res.status(400).json({
        message: "Leaderboard will be available after the competition ends",
        availableAt,
      })
    }

    const matchStage = { competitionId: competition._id }

    // Sorting
    let sortStage = {}
    if (sortBy === "time") {
      sortStage = { timeUsed: 1, totalScore: -1 }
    } else {
      sortStage = { totalScore: -1, timeUsed: 1 }
    }

    // Fields common to all roles
    const baseProjection = {
      userId: 1,
      totalScore: 1,
      correctAnswers: 1,
      totalQuestions: 1,
      timeUsed: 1,
      courseScores: 1,
      selectedCourses: 1,
      submittedAt: 1,
      isGraceSubmission: 1,
      "user.fullName": 1,
      "user.email": 1,
      "user.phoneNumber": 1,
      "user.accountNumber": 1,
      "user.bankName": 1,
      "user.courseName": 1, // ✅ course name only
    }

    const adminProjection = {
      ...baseProjection,
      "user.role": 1,
    }

    // Aggregation pipeline
    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "courseofstudies",
          localField: "user.course",
          foreignField: "_id",
          as: "user.courseDetails",
        },
      },
      {
        $unwind: {
          path: "$user.courseDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          "user.courseName": {
            $ifNull: [
              "$user.courseDetails.name",
              {
                $cond: {
                  if: { $eq: ["$user.role", "admin"] },
                  then: "Administration",
                  else: {
                    $cond: {
                      if: { $eq: ["$user.role", "superadmin"] },
                      then: "Super Administration",
                      else: "Unknown Course",
                    },
                  },
                },
              },
            ],
          },
        },
      },
      { $sort: sortStage },
      {
        $project: req.user.role === "admin" ? adminProjection : baseProjection,
      },
    ]

    // Optional course filter
    if (course) {
      pipeline.splice(1, 0, {
        $match: { "courseScores.courseCode": course },
      })
    }

    const submissions = await CompetitionSubmission.aggregate(pipeline)

    // Add ranking
    const rankedSubmissions = submissions.map((s, i) => ({
      ...s,
      rank: i + 1,
    }))

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + Number.parseInt(limit)
    const paginatedResults = rankedSubmissions.slice(startIndex, endIndex)

    // Stats
    const stats = {
      totalParticipants: submissions.length,
      averageScore:
        submissions.length > 0
          ? Math.round(
              submissions.reduce((sum, s) => sum + s.totalScore, 0) /
                submissions.length
            )
          : 0,
      highestScore:
        submissions.length > 0
          ? Math.max(...submissions.map((s) => s.totalScore))
          : 0,
    }

    // User’s rank
    const userRank =
      rankedSubmissions.findIndex(
        (s) => s.userId.toString() === req.user._id.toString()
      ) + 1

    res.json({
      leaderboard: paginatedResults,
      stats: {
        ...stats,
        userRank: userRank || null,
      },
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(submissions.length / limit),
        totalResults: submissions.length,
        hasNext: endIndex < submissions.length,
        hasPrev: startIndex > 0,
      },
    })
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router