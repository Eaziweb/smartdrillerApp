const express = require("express");
const CourseYear = require("../models/CourseYear");
const Course = require("../models/Course"); // Add this import
const { adminAuth } = require("../middleware/auth");
const router = express.Router();

// Get all course years (admin)
router.get("/admin", adminAuth, async (req, res) => {
  try {
    const courseYears = await CourseYear.find()
      .populate("createdBy", "fullName")
      .sort({ course: 1, year: -1 })
    
    // Group by course and include course name
    const groupedYears = {}
    for (const cy of courseYears) {
      if (!groupedYears[cy.course]) {
        // Get course details
        const courseDetails = await Course.findOne({ courseCode: cy.course })
        groupedYears[cy.course] = {
          courseName: courseDetails ? courseDetails.courseName : cy.course.toUpperCase(),
          years: []
        }
      }
      groupedYears[cy.course].years.push({
        _id: cy._id,
        year: cy.year,
        createdBy: cy.createdBy,
        createdAt: cy.createdAt,
      })
    }
    
    res.json({
      success: true,
      courseYears: groupedYears,
      total: courseYears.length,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Add new course year (admin)
router.post("/admin/add", adminAuth, async (req, res) => {
  try {
    const { course, year } = req.body;
    if (!course || !year) {
      return res.status(400).json({ message: "Course and year are required" });
    }
    
    // Check if course-year combination exists
    let courseYear = await CourseYear.findOne({
      course: course.toLowerCase(),
      year: year.trim(),
    })
    
    if (!courseYear) {
      courseYear = new CourseYear({
        course: course.toLowerCase(),
        year: year.trim(),
        createdBy: req.user.id,
      })
      await courseYear.save()
    }
    
    res.status(201).json({
      message: "Course year added successfully",
      courseYear,
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      res.status(400).json({ message: "This course-year combination already exists" });
    } else {
      res.status(500).json({ message: "Server error" });
    }
  }
});

// Delete course year (admin)
router.delete("/admin/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const courseYear = await CourseYear.findByIdAndDelete(id);
    
    if (!courseYear) {
      return res.status(404).json({ message: "Course year not found" });
    }
    
    res.json({ message: "Course year deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;