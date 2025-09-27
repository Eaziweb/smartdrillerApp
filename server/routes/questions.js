const express = require("express");
const mongoose = require("mongoose"); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Question = require("../models/Question");
const CourseYear = require("../models/CourseYear");
const Course = require("../models/Course");
const StudyProgress = require("../models/StudyProgress");
const { ensureCourseYearExists } = require("../utils/courseYearUtils");
const { auth, adminAuth } = require("../middleware/auth");
const subscriptionCheck = require("../middleware/subscriptionCheck");;
const { v4: uuidv4 } = require('uuid');
// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/questions");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

const router = express.Router();

// routes/questions.js

router.post("/fetch", auth, subscriptionCheck, async (req, res) => {
  try {
    const { course, year, topics, questionCount, examType } = req.body;
    
    // Build query
    const query = {
      course: course.toLowerCase(), // Search with lowercase course code
      year,
      isActive: true,
    };
    
    // Add topic filter if specific topics are selected
    if (topics && topics !== "all" && topics.length > 0) {
      const topicArray = Array.isArray(topics) ? topics : topics.split(",");
      query.topic = { $in: topicArray };
    }
    
    // Get questions with sort applied at database level
    let questions;
    if (examType === "mock") {
      // For mock mode, fetch without sorting and shuffle in memory
      questions = await Question.find(query).select("-createdBy");
      questions = questions.sort(() => Math.random() - 0.5);
    } else {
      // For study mode, sort by creation date at database level
      questions = await Question.find(query).select("-createdBy").sort({ createdAt: 1 });
    }
    
    // Only limit to requested count if it's not "all"
    if (questionCount && questionCount !== "all") {
      questions = questions.slice(0, Number.parseInt(questionCount));
    }
    
    res.json({
      success: true,
      questions,
      totalFound: questions.length,
      examType,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/search", auth, async (req, res) => {
  try {
    const {
      q,
      course,
      searchType = "question",
      page = 1,
      limit = 10
    } = req.query;
    // Build the search query
    const query = { isActive: true };
    // Add course filter if specified
    if (course) {
      query.course = course.toLowerCase();
    }
    // Add search query based on searchType
    if (q && q.trim() !== "") {
      const searchQuery = q.trim();
      
      if (searchType === "everything") {
        // Search in question, explanation, tags, and topic
        query.$or = [
          { question: { $regex: searchQuery, $options: "i" } },
          { explanation: { $regex: searchQuery, $options: "i" } },
          { tags: { $in: [new RegExp(searchQuery, "i")] } },
          { topic: { $regex: searchQuery, $options: "i" } }
        ];
      } else {
        // Default: search only in question text
        query.question = { $regex: searchQuery, $options: "i" };
      }
    }
    // Calculate pagination values
    const currentPage = Math.max(1, parseInt(page));
    const itemsPerPage = Math.max(1, Math.min(parseInt(limit), 50)); // Cap at 50 items per page
    const skip = (currentPage - 1) * itemsPerPage;
    // Execute query with pagination
    const [questions, totalCount] = await Promise.all([
      Question.find(query)
        .select("-createdBy") // Exclude createdBy field
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(itemsPerPage),
      Question.countDocuments(query)
    ]);
    // Calculate pagination details
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const hasNext = currentPage < totalPages;
    const hasPrev = currentPage > 1;
    res.json({
      success: true,
      questions,
      pagination: {
        current: currentPage,
        pages: totalPages,
        total: totalCount,
        hasNext,
        hasPrev
      }
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during search"
    });
  }
});

// Get available courses for search
// Get available course years

router.get("/study-progress", auth, subscriptionCheck, async (req, res) => {
  try {
    // Get all study progress records for this user
    const progressRecords = await StudyProgress.find({
      user: req.user.id
    }).populate("studiedQuestions");
    
    // Get all available courses and years
    const courseYears = await CourseYear.find({ isActive: true });
    
    // Structure the response
    const progressMap = {};
    
    // First, initialize progressMap with all courses and years
    for (const cy of courseYears) {
      if (!progressMap[cy.course]) {
        progressMap[cy.course] = {};
      }
      
      // Count total questions for this course and year
      const totalQuestions = await Question.countDocuments({
        course: cy.course,
        year: cy.year,
        isActive: true
      });
      
      // Initialize with default progress (0%)
      progressMap[cy.course][cy.year] = {
        studiedCount: 0,
        totalQuestions,
        percentage: 0
      };
    }
    
    // Then, update with actual progress data for studied courses/years
    for (const record of progressRecords) {
      // Only update if this course-year combination exists in our map
      if (progressMap[record.course] && progressMap[record.course][record.year]) {
        // Recalculate total questions to ensure accuracy
        const totalQuestions = await Question.countDocuments({
          course: record.course,
          year: record.year,
          isActive: true
        });
        
        progressMap[record.course][record.year] = {
          studiedCount: record.studiedQuestions.length,
          totalQuestions,
          percentage: totalQuestions > 0 ? Math.round((record.studiedQuestions.length / totalQuestions) * 100) : 0
        };
      }
    }
    
    res.json({
      success: true,
      progress: progressMap
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Reset study progress for a specific course and year
router.delete("/study-progress/:course/:year", auth, subscriptionCheck, async (req, res) => {
  try {
    const { course, year } = req.params;
    
    await StudyProgress.findOneAndDelete({
      user: req.user.id,
      course: course.toLowerCase(),
      year
    });
    
    res.json({
      success: true,
      message: "Study progress reset successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get available course years (only for active courses)
router.get("/course-years", auth, subscriptionCheck, async (req, res) => {
  try {
    // Get active courses first
    const activeCourses = await Course.find({ isActive: true }).select('courseCode');
    const activeCourseCodes = activeCourses.map(course => course.courseCode);
    
    // Then get courseYears for active courses only
    const courseYears = await CourseYear.find({ 
      course: { $in: activeCourseCodes },
      isActive: true 
    }).select("course year").sort({ course: 1, year: -1 });
    
    // Group by course
    const groupedYears = {};
    courseYears.forEach((cy) => {
      if (!groupedYears[cy.course]) {
        groupedYears[cy.course] = [];
      }
      groupedYears[cy.course].push(cy.year);
    });
    
    res.json(groupedYears);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get available topics for a course
router.get("/topics/:course", auth, subscriptionCheck, async (req, res) => {
  try {
    const { course } = req.params;
    const topics = await Question.distinct("topic", {
      course: course.toLowerCase(), // Search with lowercase course code
      isActive: true,
    });
    res.json(topics.sort());
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get study progress for a specific course
router.get("/study-progress/:courseCode", auth, subscriptionCheck, async (req, res) => {
  try {
    const { courseCode } = req.params;
    const course = courseCode.toLowerCase();
    // Get all years for this course that have questions
    const yearsWithQuestions = await Question.distinct('year', {
      course,
      isActive: true
    });
    // Get all study progress records for this user and course
    const progressRecords = await StudyProgress.find({
      user: req.user.id,
      course
    });
    // Create a map of year to progress data
    const progressMap = {};
    for (const year of yearsWithQuestions) {
      // Count total questions for this year
      const totalQuestions = await Question.countDocuments({
        course,
        year,
        isActive: true
      });
      // Find the progress record for this year
      const record = progressRecords.find(p => p.year === year);
      const studiedQuestions = record ? record.studiedQuestions.length : 0;
      progressMap[year] = {
        totalQuestions,
        studiedQuestions,
        percentage: totalQuestions > 0 ? Math.round((studiedQuestions / totalQuestions) * 100) : 0
      };
    }
    res.json({
      success: true,
      progress: progressMap
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Record study progress when a user studies a question
router.post("/study-progress", auth, subscriptionCheck, async (req, res) => {
  try {
    const { questionId } = req.body;
    if (!questionId) {
      return res.status(400).json({ message: "Question ID is required" });
    }
    // Find the question to get course and year
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }
    const { course, year } = question;
    // Find or create study progress record
    let progress = await StudyProgress.findOne({
      user: req.user.id,
      course,
      year
    });
    if (!progress) {
      progress = new StudyProgress({
        user: req.user.id,
        course,
        year,
        studiedQuestions: [questionId]
      });
    } else {
      // Add the question if not already studied
      if (!progress.studiedQuestions.includes(questionId)) {
        progress.studiedQuestions.push(questionId);
      }
    }
    await progress.save();
    res.status(201).json({
      message: "Study progress recorded",
      progress: {
        course,
        year,
        studiedCount: progress.studiedQuestions.length
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: Add question with image upload
// Admin: Add question with image upload
router.post("/admin/add", adminAuth, upload.single("image"), async (req, res) => {
  try {
    const { question, options, correctOption, explanation, tags, course, year, topic } = req.body;
    
    // Validate required fields
    if (!question || !options || correctOption === undefined || !explanation || !course || !year || !topic) {
      return res.status(400).json({ message: "All fields are required" });
    }
    
    // Parse options
    let parsedOptions;
    try {
      parsedOptions = Array.isArray(options) ? options : JSON.parse(options);
    } catch (error) {
      return res.status(400).json({ message: "Invalid options format" });
    }
    
    // Updated validation: Allow 2-4 options
    if (!Array.isArray(parsedOptions) || parsedOptions.length < 2 || parsedOptions.length > 4) {
      return res.status(400).json({ message: "Options must be an array of 2-4 items" });
    }
    
    // Convert and validate correctOption
    const correctOptionNumber = Number(correctOption);
    if (isNaN(correctOptionNumber)) {
      return res.status(400).json({ message: "Correct option must be a number" });
    }
    
    // Updated validation: Check against actual number of options
    if (correctOptionNumber < 1 || correctOptionNumber > parsedOptions.length) {
      return res.status(400).json({ message: `Correct option must be between 1 and ${parsedOptions.length}` });
    }
    
    // Check if course exists and is active
    const courseExists = await Course.findOne({ courseCode: course.toLowerCase(), isActive: true });
    if (!courseExists) {
      return res.status(400).json({ message: "Course does not exist or is not active. Please add the course first." });
    }
    
    // Ensure course-year combination exists
    await ensureCourseYearExists(course.toLowerCase(), year.trim(), req.user.id);
    
    // Parse tags
    let parsedTags = [];
    try {
      if (tags) {
        parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
      }
    } catch (error) {
      // If tags is not valid JSON, try splitting by comma
      parsedTags = tags.split(",").map(tag => tag.trim()).filter(Boolean);
    }
    
    const newQuestion = new Question({
      question: question.trim(),
      image: req.file ? `/uploads/questions/${req.file.filename}` : null,
      options: parsedOptions.map(opt => opt.trim()),
      correctOption: correctOptionNumber,
      explanation: explanation.trim(),
      tags: parsedTags,
      course: course.toLowerCase(),
      year: year.trim(),
      topic: topic.trim(),
      createdBy: req.user.id,
    });
    
    await newQuestion.save();
    res.status(201).json({
      message: "Question added successfully",
      question: newQuestion,
    });
  } catch (error) {
    console.error("Error adding question:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
});

// Similarly update the PUT route for editing questions
router.put("/admin/:id", adminAuth, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { question, options, correctOption, explanation, tags, course, year, topic } = req.body;
    
    // Find the existing question
    const existingQuestion = await Question.findById(id);
    if (!existingQuestion) {
      return res.status(404).json({ message: "Question not found" });
    }
    
    // Prepare update object
    const updates = {};
    
    // Update fields if provided
    if (question !== undefined) updates.question = question.trim();
    if (options !== undefined) {
      try {
        const parsedOptions = Array.isArray(options) ? options : JSON.parse(options);
        // Updated validation: Allow 2-4 options
        if (!Array.isArray(parsedOptions) || parsedOptions.length < 2 || parsedOptions.length > 4) {
          return res.status(400).json({ message: "Options must be an array of 2-4 items" });
        }
        updates.options = parsedOptions.map(opt => opt.trim());
      } catch (error) {
        return res.status(400).json({ message: "Invalid options format" });
      }
    }
    if (correctOption !== undefined) {
      const correctOptionNumber = Number(correctOption);
      if (isNaN(correctOptionNumber)) {
        return res.status(400).json({ message: "Correct option must be a number" });
      }
      
      // Get the number of options (either from updates or existing question)
      const numOptions = updates.options ? updates.options.length : existingQuestion.options.length;
      
      // Updated validation: Check against actual number of options
      if (correctOptionNumber < 1 || correctOptionNumber > numOptions) {
        return res.status(400).json({ message: `Correct option must be between 1 and ${numOptions}` });
      }
      updates.correctOption = correctOptionNumber;
    }
    if (explanation !== undefined) updates.explanation = explanation.trim();
    if (course !== undefined) updates.course = course.toLowerCase();
    if (year !== undefined) updates.year = year.trim();
    if (topic !== undefined) updates.topic = topic.trim();
    
    // Handle tags
    if (tags !== undefined) {
      try {
        updates.tags = Array.isArray(tags) ? tags : JSON.parse(tags);
      } catch (error) {
        // If tags is not valid JSON, try splitting by comma
        updates.tags = tags.split(",").map(tag => tag.trim()).filter(Boolean);
      }
    }
    
    // Handle image
    if (req.file) {
      updates.image = `/uploads/questions/${req.file.filename}`;
    }
    
    // Update the question
    const updatedQuestion = await Question.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    
    res.json({
      message: "Question updated successfully",
      question: updatedQuestion,
    });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
});

// Add a new endpoint to get question statistics
router.get("/statistics", adminAuth, async (req, res) => {
  try {
    // Get total questions count
    const totalQuestions = await Question.countDocuments({ isActive: true });
    
    // Get questions per course
    const courseStats = await Question.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$course",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    // Get questions per year
    const yearStats = await Question.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$year",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);
    
    // Get questions per topic (top 10)
    const topicStats = await Question.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$topic",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    res.json({
      totalQuestions,
      courseStats,
      yearStats,
      topicStats
    });
  } catch (error) {
    console.error("Error fetching question statistics:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update bulk import to handle variable number of options
router.post("/admin/bulk-import", adminAuth, async (req, res) => {
  // Generate a unique import ID for this operation
  const importId = require('uuid').v4();
  let expectedCount = 0;
  
  // Set a longer timeout for this route
  req.setTimeout(10 * 60 * 1000); // 10 minutes
  
  try {
    let questions = req.body.questions;
    
    if (!Array.isArray(questions)) {
      return res.status(400).json({ 
        message: "Invalid request format. 'questions' must be an array." 
      });
    }
    
    expectedCount = questions.length;
    
    // Phase 1: Validate all questions
    const validationErrors = [];
    const courseYearChecks = new Set();
    const questionsToInsert = [];
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      // Validate required fields
      if (!q.question || !q.options || q.correctOption === undefined || 
          !q.explanation || !q.course || !q.year || !q.topic) {
        validationErrors.push(`Question ${i + 1}: Missing required fields`);
        continue;
      }
      
      // Validate options - Updated to allow 2-4 options
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4) {
        validationErrors.push(`Question ${i + 1}: Must have between 2 and 4 options`);
        continue;
      }
      
      // Validate correct option
      const correctOptionNumber = Number(q.correctOption);
      if (isNaN(correctOptionNumber) || correctOptionNumber < 1 || correctOptionNumber > q.options.length) {
        validationErrors.push(`Question ${i + 1}: Correct option must be between 1 and ${q.options.length}`);
        continue;
      }
      
      // Check if course exists and is active
      const courseExists = await Course.findOne({
        courseCode: q.course.toLowerCase(),
        isActive: true,
      });
      
      if (!courseExists) {
        validationErrors.push(`Question ${i + 1}: Course ${q.course.toUpperCase()} does not exist or is not active`);
        continue;
      }
      
      courseYearChecks.add(`${q.course.toLowerCase()}-${q.year.trim()}`);
      
      questionsToInsert.push({
        question: q.question.trim(),
        image: q.image ? q.image.trim() : null,
        options: q.options.map((opt) => opt.trim()),
        correctOption: correctOptionNumber,
        explanation: q.explanation.trim(),
        tags: Array.isArray(q.tags) ? q.tags.map((tag) => tag.trim()) : [],
        course: q.course.toLowerCase(),
        year: q.year.trim(),
        topic: q.topic.trim(),
        createdBy: req.user.id,
        importId: importId,
        importStatus: 'pending',
      });
    }
    
    // If there are validation errors, return them without inserting anything
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: "Validation failed",
        errors: validationErrors 
      });
    }
    
    // Ensure course-year combinations exist
    for (const courseYear of courseYearChecks) {
      const [course, year] = courseYear.split('-');
      let exists = await CourseYear.findOne({ course, year });
      if (!exists) {
        exists = new CourseYear({
          course,
          year,
          createdBy: req.user.id,
        });
        await exists.save();
      }
    }
    
    // Phase 2: Insert all questions with pending status
    const result = await Question.insertMany(questionsToInsert);
    const actualCount = result.length;
    
    // Phase 3: Verify all questions were inserted
    if (actualCount !== expectedCount) {
      // If counts don't match, clean up the pending questions
      await Question.deleteMany({ importId: importId });
      throw new Error(`Import incomplete. Expected ${expectedCount} questions, but only inserted ${actualCount}.`);
    }
    
    // Phase 4: Activate all questions in a single atomic operation
    const activationResult = await Question.updateMany(
      { importId: importId, importStatus: 'pending' },
      { $set: { importStatus: 'active' }, $unset: { importId: 1 } }
    );
    
    // Verify activation was successful
    if (activationResult.modifiedCount !== actualCount) {
      // If activation failed, clean up the pending questions
      await Question.deleteMany({ importId: importId });
      throw new Error(`Activation failed. Expected to activate ${actualCount} questions, but only activated ${activationResult.modifiedCount}.`);
    }
    
    res.json({
      message: `Successfully imported ${actualCount} questions`,
      imported: actualCount,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    
    // Clean up any pending questions if import failed
    try {
      const deleteResult = await Question.deleteMany({ importId: importId });
      console.log(`Cleaned up ${deleteResult.deletedCount} pending questions`);
    } catch (cleanupError) {
      console.error("Cleanup failed:", cleanupError);
    }
    
    res.status(500).json({ message: "Server error: " + error.message });
  }
});
// Admin: Clean up pending imports
router.post("/admin/cleanup-pending", adminAuth, async (req, res) => {
  try {
    // Delete all questions that are still in pending state
    const result = await Question.deleteMany({ importStatus: 'pending' });
    
    res.json({
      message: `Cleaned up ${result.deletedCount} pending questions`,
      deleted: result.deletedCount,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
});

// Admin: Search questions
router.get("/admin/search", adminAuth, async (req, res) => {
  try {
    const { q, course, year, topic, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };
    if (q) {
      query.$or = [
        { question: { $regex: q, $options: "i" } },
        { explanation: { $regex: q, $options: "i" } },
        { tags: { $in: [new RegExp(q, "i")] } },
      ];
    }
    if (course) query.course = course.toLowerCase(); // Search with lowercase course code
    if (year) query.year = year;
    if (topic) query.topic = topic;
    const skip = (page - 1) * limit;
    const questions = await Question.find(query)
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit));
    const total = await Question.countDocuments(query);
    res.json({
      questions,
      pagination: {
        current: Number.parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: Delete question
router.delete("/admin/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }
    res.json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;