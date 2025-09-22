const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const { auth } = require("../middleware/auth")
const Material = require("../models/Material")
const  Course = require("../models/Course")

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/materials"
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|ppt|pptx|mp4|mp3|txt/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("Only documents, videos, and audio files are allowed"))
    }
  },
})

router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 12, search = "", course = "", type = "" } = req.query

    const query = { isApproved: true } // Only show approved materials

    if (search) {
      query.$or = [{ title: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }]
    }

    if (course) {
      query.course = course
    }

    if (type) {
      query.fileType = type
    }

    const materials = await Material.find(query)
      .populate("course", "courseName courseCode")
      .populate("uploadedBy", "fullName")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Material.countDocuments(query)
    const totalPages = Math.ceil(total / limit)

    const formattedMaterials = materials.map((material) => ({
      _id: material._id,
      title: material.title,
      description: material.description,
      filename: material.filename,
      fileSize: material.fileSize,
      fileType: material.fileType,
      courseName: material.course?.courseName || material.course?.courseCode || "Unknown",
      courseCode: material.course?.courseCode,
      uploaderName: material.uploadedBy?.fullName || "Unknown",
      downloadCount: material.downloadCount,
      createdAt: material.createdAt,
    }))

    res.json({
      success: true,
      materials: formattedMaterials,
      currentPage: Number.parseInt(page),
      totalPages,
      total,
    })
  } catch (error) {
    console.error("Error fetching materials:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch materials",
    })
  }
})
// Get courses for filter dropdown
router.get("/courses", auth, async (req, res) => {
  try {
    // Include both courseName and courseCode
    const courses = await Course.find({}, "courseName courseCode").sort({ courseName: 1 })
    
    // Format the courses to include both name and code
    const formattedCourses = courses.map(course => ({
      _id: course._id,
      name: course.courseName,
      code: course.courseCode // Add course code
    }))
    
    res.json({
      success: true,
      courses: formattedCourses
    })
  } catch (error) {
    console.error("Error fetching courses:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch courses"
    })
  }
})
// routes/materials.js
// Upload material
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    const { title, description, course } = req.body

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required",
      })
    }

    const fileExtension = path.extname(req.file.originalname).toLowerCase().substring(1)

    const material = new Material({
      title,
      description,
      filename: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      fileType: fileExtension,
      course,
      uploadedBy: req.user.id,
      isApproved: false, // Explicitly set to false
    })

    await material.save()

    res.json({
      success: true,
      message: "Material uploaded successfully and is pending admin approval",
      material,
    })
  } catch (error) {
    console.error("Error uploading material:", error)
    res.status(500).json({
      success: false,
      message: "Failed to upload material",
    })
  }
})

// Download material
router.get("/:id/download", auth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id)

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material not found",
      })
    }

    // Increment download count
    material.downloadCount = (material.downloadCount || 0) + 1
    await material.save()

    // Check if file exists
    if (!fs.existsSync(material.filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found on server",
      })
    }

    res.download(material.filePath, material.filename)
  } catch (error) {
    console.error("Error downloading material:", error)
    res.status(500).json({
      success: false,
      message: "Failed to download material",
    })
  }
})

module.exports = router
