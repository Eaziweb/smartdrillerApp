const express = require("express")
const Course = require("../models/Course")
const { adminAuth } = require("../middleware/auth")
const router = express.Router()

// Get all courses (admin)
router.get("/admin", adminAuth, async (req, res) => {
  try {
    const courses = await Course.find().sort({ semester: 1, courseCode: 1 })
    res.json(courses)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Add a new course
router.post("/admin/add", adminAuth, async (req, res) => {
  try {
    const { courseCode, courseName, semester } = req.body
    if (!courseCode || !courseName || !semester) {
      return res.status(400).json({ message: "All fields are required" })
    }
    if (!['first', 'second'].includes(semester)) {
      return res.status(400).json({ message: "Semester must be 'first' or 'second'" })
    }
    const course = new Course({
      courseCode: courseCode.toLowerCase(),
      courseName: courseName.trim(),
      semester,
      createdBy: req.user.id,
    })
    await course.save()
    res.status(201).json({
      message: "Course added successfully",
      course,
    })
  } catch (error) {
    console.error(error)
    if (error.code === 11000) {
      res.status(400).json({ message: "Course code already exists" })
    } else {
      res.status(500).json({ message: "Server error" })
    }
  }
})

// Update a course (including toggling isActive)
router.put("/admin/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { courseCode, courseName, semester, isActive } = req.body
    const updates = {}
    if (courseCode !== undefined) updates.courseCode = courseCode.toLowerCase()
    if (courseName !== undefined) updates.courseName = courseName.trim()
    if (semester !== undefined) {
      if (!['first', 'second'].includes(semester)) {
        return res.status(400).json({ message: "Semester must be 'first' or 'second'" })
      }
      updates.semester = semester
    }
    if (isActive !== undefined) updates.isActive = isActive
    const course = await Course.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }
    res.json({
      message: "Course updated successfully",
      course,
    })
  } catch (error) {
    console.error(error)
    if (error.code === 11000) {
      res.status(400).json({ message: "Course code already exists" })
    } else {
      res.status(500).json({ message: "Server error" })
    }
  }
})

// Toggle course activation status (activate/deactivate)
router.put("/admin/:id/toggle-status", adminAuth, async (req, res) => {
  try {
    const { id } = req.params
    const course = await Course.findById(id)
    
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }
    
    // Toggle the isActive status
    course.isActive = !course.isActive
    await course.save()
    
    res.json({
      message: `Course ${course.isActive ? 'activated' : 'deactivated'} successfully`,
      course,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Deactivate all courses in a semester
router.post("/admin/deactivate-semester", adminAuth, async (req, res) => {
  try {
    const { semester } = req.body
    if (!semester || !['first', 'second', 'both'].includes(semester)) {
      return res.status(400).json({ message: "Semester must be 'first', 'second', or 'both'" })
    }
    let filter = {}
    if (semester === 'both') {
      filter = { semester: { $in: ['first', 'second'] } }
    } else {
      filter = { semester }
    }
    const result = await Course.updateMany(filter, { isActive: false })
    res.json({
      message: `Deactivated ${result.modifiedCount} courses in ${semester === 'both' ? 'both semesters' : semester + ' semester'}`,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get active courses by semester (for course selection page)
router.get("/", async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true }).sort({ semester: 1, courseCode: 1 })
    // Group by semester
    const groupedCourses = {
      first: [],
      second: [],
    }
    courses.forEach(course => {
      groupedCourses[course.semester].push({
        courseCode: course.courseCode,
        courseName: course.courseName,
      })
    })
    res.json(groupedCourses)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})


router.get("/:courseCode", async (req, res) => {
  try {
    const { courseCode } = req.params;
    const course = await Course.findOne({ 
      courseCode: courseCode.toLowerCase(),
      isActive: true 
    });
    
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    
    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router