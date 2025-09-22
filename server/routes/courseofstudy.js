// routes/courses.js
const express = require("express");
const router = express.Router();
const CourseofStudy = require("../models/CourseofStudy");
const { adminAuth } = require("../middleware/auth");

// ✅ Master list of courses (by category)
const defaultCourses = {
  Agriculture: [
    "Agricultural Economics",
    "Agricultural Economics/Extension",
    "Agricultural Education",
    "Agricultural Engineering",
    "Agricultural Extension",
    "Agricultural Science",
    "Agronomy",
    "Animal Production",
    "Animal Science",
    "Crop Production",
    "Crop Science",
    "Family, Nutrition And Consumer Sciences",
    "Fisheries",
    "Food Science and Technology",
    "Forestry",
    "Plant Science",
    "Soil Science",
    "Water Resources Management And Agrometerorology",
  ],
  Engineering: [
    "Engineering",
    "Automobile Engineering",
    "Biomedical Engineering",
    "Chemical Engineering",
    "Civil Engineering",
    "Computer Engineering",
    "Aerospace/Aeronautic Engineering",
    "Electrical Engineering",
    "Engineering Physics",
    "Food Science and Engineering",
    "Industrial and Production Engineering",
    "Information Communication Engineering",
    "Mechanical Engineering",
    "Mechatronics Engineering",
    "Metallurgical Engineering",
    "Water Resources and Environmental Engineering",
    "Software Engineering",
    "System Engineering",
    "Petroleum Engineering",
  ],
  "Medicine & Pharmacy": [
    "Anatomy",
    "Biochemistry",
    "Medical Laboratory Technology/Science",
    "Medicine & Surgery",
    "Nursing",
    "Pharmacy",
    "Physiology",
    "Public Health Technology",
    "Veterinary Medicine",
  ],
  "Arts, Management & Social Science": [
    "Accounting",
    "Arabic",
    "Banking and Finance",
    "Business Administration",
    "Communication Arts",
    "Criminology and Security Studies",
    "Curriculum Studies",
    "Demography and Social Statistics",
    "Economics",
    "English Language",
    "Entrepreneurship",
    "Fine Arts",
    "French",
    "Hausa",
    "History",
    "Home Economics",
    "Hospitality and Tourism Management",
    "Human Resource Management",
    "Igbo",
    "Insurance",
    "International Relations",
    "Islamic Studies",
    "Linguistics",
    "Marketing",
    "Mass Communication",
    "Media and Communication Studies",
    "Music",
    "Peace and Conflict Resolution",
    "Performing Arts",
    "Philosophy",
    "Political Science",
    "Project Management",
    "Psychology",
    "Public Administration",
    "Religious Studies",
    "Social Works",
    "Sociology",
    "Taxation",
    "Tourism Studies",
    "Theology",
    "Yoruba",
  ],
  "Science & Technology": [
    "Architecture",
    "Biochemistry",
    "Bio-Informatics",
    "Biology",
    "Botany",
    "Building Technology",
    "Computer Science",
    "Cyber Security Science",
    "Estate Management",
    "Chemistry",
    "Geography",
    "Geophysics",
    "Geology",
    "Human Nutrition and Dietetics",
    "Information Resource Management",
    "Information Systems",
    "Information Technology",
    "Library and Information Science",
    "Management Information System",
    "Mathematics",
    "Microbiology",
    "Physics",
    "Plant Science",
    "Statistics",
    "Urban and Regional Planning",
    "Veterinary Medicine",
    "Zoology",
  ],
  Education: [
    "Adult Education",
    "Agricultural Education",
    "Business Education",
    "Counsellor Education",
    "Early Childhood Education",
    "Education Administration",
    "Education & Accounting",
    "Education & Arabic",
    "Education & Biology",
    "Education & Business Administration",
    "Education & Chemistry",
    "Education & Computer Science",
    "Education & Christian Religious Studies",
    "Education & Economics",
    "Education & Fine Art",
    "Education & English Language",
    "Education & French",
    "Education & Geography",
    "Education & Geography/Physics",
    "Education & History",
    "Education & Integrated Science",
    "Education & Introductory Technology",
    "Education & Islamic Studies",
    "Education & Mathematics",
    "Education & Music",
    "Education & Physics",
    "Education & Political Science",
    "Education & Religious Studies",
    "Education & Social Studies",
    "Education Arts",
    "Education Foundation",
    "Environmental Education",
    "Guidance and Counselling",
    "Health Education",
    "Vocational Education",
    "Special Education",
  ],
  Law: [
    "Law",
    "Civil Law",
    "Sharia/Islamic Law",
    "Private Law",
    "Public Law",
    "Commercial Law",
    "International Law & Jurisprudence",
  ],
  Administration: [
    "Administration",
    "Super-Administration"

  ]
};



// 📌 Route: get all courses (public)
router.get("/", async (req, res) => {
  try {
    // Fetch all courses from the database
    const courses = await CourseofStudy.find().sort({ category: 1, name: 1 });
    
    res.json({ courses });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// 📌 Route: get courses by category (public)
router.get("/:category", async (req, res) => {
  try {
    const category = req.params.category;
    
    // Fetch courses for the specified category
    const courses = await CourseofStudy.find({ category }).sort({ name: 1 });
    
    if (!courses || courses.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    res.json({ category, courses });
  } catch (error) {
    console.error("Error fetching courses by category:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// 📌 Route: search courses (public)
router.get("/search/:query", async (req, res) => {
  try {
    const query = req.params.query.toLowerCase();
    
    // Search for courses that match the query in name or category
    const courses = await CourseofStudy.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } }
      ]
    }).sort({ category: 1, name: 1 });
    
    res.json({ courses });
  } catch (error) {
    console.error("Error searching courses:", error);
    res.status(500).json({ error: "Failed to search courses" });
  }
});

// 📌 Route: get course by ID (public)
router.get("/id/:id", async (req, res) => {
  try {
    const course = await CourseofStudy.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    
    res.json({ course });
  } catch (error) {
    console.error("Error fetching course by ID:", error);
    res.status(500).json({ error: "Failed to fetch course" });
  }
});

// 📌 Route: get all categories (public)
router.get("/categories/list", async (req, res) => {
  try {
    // Get distinct categories from the database
    const categories = await CourseofStudy.distinct("category");
    
    // Sort categories alphabetically
    categories.sort();
    
    res.json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});


// 📌 Route: add a new course (admin only)
router.post("/", adminAuth, async (req, res) => {
  try {
    const { name, category } = req.body;
    
    if (!name || !category) {
      return res.status(400).json({ error: "Name and category are required" });
    }
    
    // Check if course already exists
    const existingCourse = await CourseofStudy.findOne({ name, category });
    
    if (existingCourse) {
      return res.status(400).json({ error: "Course already exists" });
    }
    
    // Create new course
    const newCourse = new CourseofStudy({ name, category });
    await newCourse.save();
    
    res.status(201).json({
      message: "Course added successfully",
      course: newCourse
    });
  } catch (error) {
    console.error("Error adding course:", error);
    res.status(500).json({ error: "Failed to add course" });
  }
});

// 📌 Route: update a course (admin only)
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const { name, category } = req.body;
    
    if (!name || !category) {
      return res.status(400).json({ error: "Name and category are required" });
    }
    
    // Find and update the course
    const updatedCourse = await CourseofStudy.findByIdAndUpdate(
      req.params.id,
      { name, category },
      { new: true, runValidators: true }
    );
    
    if (!updatedCourse) {
      return res.status(404).json({ error: "Course not found" });
    }
    
    res.json({
      message: "Course updated successfully",
      course: updatedCourse
    });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ error: "Failed to update course" });
  }
});

// 📌 Route: delete a course (admin only)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const deletedCourse = await CourseofStudy.findByIdAndDelete(req.params.id);
    
    if (!deletedCourse) {
      return res.status(404).json({ error: "Course not found" });
    }
    
    res.json({
      message: "Course deleted successfully",
      course: deletedCourse
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ error: "Failed to delete course" });
  }
});

module.exports = router;