// routes/admin/competitions.js
const express = require("express")
const Competition = require("../models/Competition")
const CompetitionQuestion = require("../models/CompetitionQuestion")
const CompetitionSubmission = require("../models/CompetitionSubmission")
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

// Get all competitions (admin)
router.get("/", adminAuth, async (req, res) => {
  try {
    const competitions = await Competition.find().populate("createdBy", "fullName").sort({ createdAt: -1 })
    // Update status for each competition
    for (const competition of competitions) {
      await competition.updateStatus()
    }
    res.json(competitions)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create competition
router.post("/", adminAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
      courses,
      requiredCourses,
      instructions,
      graceMinutes,
      leaderboardDelay,
    } = req.body
    
    const competition = new Competition({
      name,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      courses: courses || [],
      requiredCourses,
      instructions,
      graceMinutes: graceMinutes || 30,
      leaderboardDelay: leaderboardDelay || 30,
      createdBy: req.user._id,
    })
    
    await competition.save()
    await competition.updateStatus()
    res.status(201).json(competition)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update competition
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
      courses,
      requiredCourses,
      instructions,
      graceMinutes,
      leaderboardDelay,
    } = req.body
    
    const competition = await Competition.findById(req.params.id)
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" })
    }
    
    competition.name = name || competition.name
    competition.description = description || competition.description
    competition.startDate = startDate ? new Date(startDate) : competition.startDate
    competition.endDate = endDate ? new Date(endDate) : competition.endDate
    competition.courses = courses || competition.courses
    competition.requiredCourses = requiredCourses || competition.requiredCourses
    competition.instructions = instructions !== undefined ? instructions : competition.instructions
    competition.graceMinutes = graceMinutes !== undefined ? graceMinutes : competition.graceMinutes
    competition.leaderboardDelay = leaderboardDelay !== undefined ? leaderboardDelay : competition.leaderboardDelay
    
    await competition.save()
    await competition.updateStatus()
    res.json(competition)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get single competition (admin)
router.get("/:id", adminAuth, async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id).populate("createdBy", "fullName")
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" })
    }
    await competition.updateStatus()
    res.json(competition)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete competition
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id)
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" })
    }
    
    // Delete all related questions and submissions
    await CompetitionQuestion.deleteMany({ competitionId: competition._id })
    await CompetitionSubmission.deleteMany({ competitionId: competition._id })
    await Competition.findByIdAndDelete(req.params.id)
    
    res.json({ message: "Competition deleted successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Add course to competition
router.post("/:id/courses", adminAuth, async (req, res) => {
  try {
    const { courseCode, courseName, questionsToShow, timeAllowed } = req.body
    
    const competition = await Competition.findById(req.params.id)
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" })
    }
    
    // Check if course already exists
    if (competition.courses.some(c => c.courseCode === courseCode)) {
      return res.status(400).json({ message: "Course already exists in this competition" })
    }
    
    // Add new course with required fields
    const newCourse = {
      courseCode,
      courseName,
      questionsToShow,
      timeAllowed,
      questionsCount: 0, // Initially 0 questions
    }
    
    competition.courses.push(newCourse)
    await competition.save()
    
    res.status(201).json({
      message: "Course added successfully",
      course: newCourse
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Remove course from competition
router.delete("/:id/courses/:courseCode", adminAuth, async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id)
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" })
    }
    
    // Delete all questions for this course
    await CompetitionQuestion.deleteMany({
      competitionId: competition._id,
      courseCode: req.params.courseCode
    })
    
    competition.courses = competition.courses.filter(
      c => c.courseCode !== req.params.courseCode
    )
    
    await competition.save()
    res.json({ message: "Course and its questions removed successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Add single question
router.post("/:id/questions", adminAuth, upload.single("image"), async (req, res) => {
  try {
    const { question, options, correctOption, courseCode } = req.body
    const competition = await Competition.findById(req.params.id)
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" })
    }
    
    // Validate that the course exists in the competition
    const courseExists = competition.courses.some(c => c.courseCode === courseCode)
    if (!courseExists) {
      return res.status(400).json({ message: "Course not found in this competition" })
    }
    
    let parsedOptions
    try {
      parsedOptions = typeof options === "string" ? JSON.parse(options) : options
    } catch (e) {
      return res.status(400).json({ message: "Invalid options format" })
    }
    
    // Validate options
    if (!Array.isArray(parsedOptions) || parsedOptions.length < 2 || parsedOptions.length > 6) {
      return res.status(400).json({ message: "Question must have between 2 and 6 options" })
    }
    
    // Validate correct option
    const correctOptionNum = parseInt(correctOption)
    if (isNaN(correctOptionNum) || correctOptionNum < 1 || correctOptionNum > parsedOptions.length) {
      return res.status(400).json({ message: "Correct option must be between 1 and the number of options" })
    }
    
    const questionData = {
      question,
      options: parsedOptions,
      correctOption: correctOptionNum,
      competitionId: competition._id,
      courseCode,
      createdBy: req.user._id,
    }
    
    if (req.file) {
      questionData.image = `/uploads/competition-images/${req.file.filename}`
    }
    
    const newQuestion = new CompetitionQuestion(questionData)
    await newQuestion.save()
    
    // Update course questions count
    await competition.updateCourseQuestionsCount(courseCode)
    
    res.status(201).json(newQuestion)
  } catch (error) {
    console.error("Error adding question:", error)
    res.status(500).json({ message: error.message || "Server error" })
  }
})

// Update question
router.put("/:id/questions/:questionId", adminAuth, upload.single("image"), async (req, res) => {
  try {
    const { question, options, correctOption } = req.body
    const questionDoc = await CompetitionQuestion.findById(req.params.questionId)
    if (!questionDoc) {
      return res.status(404).json({ message: "Question not found" })
    }
    
    let parsedOptions
    try {
      parsedOptions = options ? (typeof options === "string" ? JSON.parse(options) : options) : questionDoc.options
    } catch (e) {
      return res.status(400).json({ message: "Invalid options format" })
    }
    
    // Validate options
    if (parsedOptions && (!Array.isArray(parsedOptions) || parsedOptions.length < 2 || parsedOptions.length > 6)) {
      return res.status(400).json({ message: "Question must have between 2 and 6 options" })
    }
    
    // Update fields
    if (question) questionDoc.question = question
    if (parsedOptions) questionDoc.options = parsedOptions
    
    if (correctOption !== undefined) {
      const correctOptionNum = parseInt(correctOption)
      if (isNaN(correctOptionNum)) {
        return res.status(400).json({ message: "Correct option must be a number" })
      }
      
      // Validate correct option is within options range
      if (correctOptionNum < 1 || correctOptionNum > questionDoc.options.length) {
        return res.status(400).json({ message: "Correct option must be between 1 and the number of options" })
      }
      
      questionDoc.correctOption = correctOptionNum
    }
    
    if (req.file) {
      questionDoc.image = `/uploads/competition-images/${req.file.filename}`
    }
    
    await questionDoc.save()
    
    // Update course questions count
    const competition = await Competition.findById(req.params.id)
    if (competition) {
      await competition.updateCourseQuestionsCount(questionDoc.courseCode)
    }
    
    res.json(questionDoc)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: error.message || "Server error" })
  }
})

// Delete question
router.delete("/:id/questions/:questionId", adminAuth, async (req, res) => {
  try {
    const question = await CompetitionQuestion.findById(req.params.questionId)
    if (!question) {
      return res.status(404).json({ message: "Question not found" })
    }
    
    const competition = await Competition.findById(req.params.id)
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" })
    }
    
    const courseCode = question.courseCode
    await CompetitionQuestion.findByIdAndDelete(req.params.questionId)
    
    // Update course questions count
    await competition.updateCourseQuestionsCount(courseCode)
    
    res.json({ message: "Question deleted successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Bulk import questions
router.post("/:id/questions/bulk", adminAuth, async (req, res) => {
  try {
    const { questions, courseCode } = req.body
    const competition = await Competition.findById(req.params.id)
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" })
    }
    
    // Validate that the course exists in the competition
    const courseExists = competition.courses.some(c => c.courseCode === courseCode)
    if (!courseExists) {
      return res.status(400).json({ message: "Course not found in this competition" })
    }
    
    // Validate questions is an array
    if (!Array.isArray(questions)) {
      return res.status(400).json({ message: "Questions data must be an array" })
    }
    
    const questionsToInsert = []
    const errors = []
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      
      // Validate required fields
      if (!q.question || !q.options || q.correctOption === undefined) {
        errors.push(`Question ${i+1}: Missing required fields (question, options, correctOption)`)
        continue
      }
      
      // Validate options array
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
        errors.push(`Question ${i+1}: Must have between 2 and 6 options`)
        continue
      }
      
      // Validate correct option
      const correctOptionNum = parseInt(q.correctOption)
      if (isNaN(correctOptionNum) || correctOptionNum < 1 || correctOptionNum > q.options.length) {
        errors.push(`Question ${i+1}: Correct option must be between 1 and ${q.options.length}`)
        continue
      }
      
      questionsToInsert.push({
        question: q.question,
        options: q.options,
        correctOption: correctOptionNum,
        competitionId: competition._id,
        courseCode,
        createdBy: req.user._id,
        image: q.image || "",
      })
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        message: "Validation errors in questions",
        errors
      })
    }
    
    if (questionsToInsert.length === 0) {
      return res.status(400).json({ message: "No valid questions to import" })
    }
    
    const insertedQuestions = await CompetitionQuestion.insertMany(questionsToInsert)
    
    // Update course questions count
    await competition.updateCourseQuestionsCount(courseCode)
    
    res.status(201).json({
      message: `${insertedQuestions.length} questions imported successfully`,
      questions: insertedQuestions,
    })
  } catch (error) {
    console.error("Error importing questions:", error)
    res.status(500).json({ message: error.message || "Server error" })
  }
})

// Get competition questions
router.get("/:id/questions", adminAuth, async (req, res) => {
  try {
    const { courseCode, page = 1, limit = 20 } = req.query
    const competition = await Competition.findById(req.params.id)
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" })
    }
    
    const query = { competitionId: competition._id }
    if (courseCode) {
      query.courseCode = courseCode
    }
    
    const questions = await CompetitionQuestion.find(query)
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
    
    const total = await CompetitionQuestion.countDocuments(query)
    
    res.json({
      questions,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalResults: total,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get competition statistics
router.get("/:id/stats", adminAuth, async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id)
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" })
    }
    
    const totalQuestions = await CompetitionQuestion.countDocuments({
      competitionId: competition._id,
    })
    
    const totalSubmissions = await CompetitionSubmission.countDocuments({
      competitionId: competition._id,
    })
    
    const courseStats = await CompetitionQuestion.aggregate([
      { $match: { competitionId: competition._id } },
      {
        $group: {
          _id: "$courseCode",
          count: { $sum: 1 },
        },
      },
    ])
    
    res.json({
      totalQuestions,
      totalSubmissions,
      courseStats,
      competition,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router



