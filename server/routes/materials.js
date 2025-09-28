const express = require("express");
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const { auth } = require("../middleware/auth");
const Material = require("../models/Material");
const Course = require("../models/Course");

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'materials',
    allowed_formats: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'mp4', 'mp3', 'txt'],
    resource_type: 'auto'
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|ppt|pptx|mp4|mp3|txt/;
    const extname = allowedTypes.test(file.originalname.split('.').pop().toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) cb(null, true);
    else cb(new Error("Only documents, videos, and audio files are allowed"));
  }
});

// Get all approved materials
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 12, search = "", course = "", type = "" } = req.query;
    const query = { isApproved: true };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }
    if (course) query.course = course;
    if (type) query.fileType = type;

    const materials = await Material.find(query)
      .populate("course", "courseName courseCode")
      .populate("uploadedBy", "fullName")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((page - 1) * limit);

    const total = await Material.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({ success: true, materials, currentPage: Number(page), totalPages, total });
  } catch (error) {
    console.error("Error fetching materials:", error);
    res.status(500).json({ success: false, message: "Failed to fetch materials" });
  }
});

// Get courses for dropdown
router.get("/courses", auth, async (req, res) => {
  try {
    const courses = await Course.find({}, "courseName courseCode").sort({ courseName: 1 });
    res.json({ success: true, courses });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ success: false, message: "Failed to fetch courses" });
  }
});

// Upload material
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    const { title, description, course } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, message: "File is required" });
    }

    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();

    const material = new Material({
      title,
      description,
      cloudinaryUrl: req.file.path,
      cloudinaryPublicId: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      fileType: fileExtension,
      course,
      uploadedBy: req.user.id,
      isApproved: false,
    });

    await material.save();
    res.json({ 
      success: true, 
      message: "Material uploaded successfully (pending admin approval)", 
      material 
    });
  } catch (error) {
    console.error("Error uploading material:", error);
    res.status(500).json({ success: false, message: "Failed to upload material" });
  }
});

// Download material
router.get("/:id/download", auth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id)
    if (!material) {
      return res.status(404).json({ success: false, message: "Material not found" })
    }

    // Check if we have a Cloudinary URL
    if (!material.cloudinaryUrl) {
      return res.status(404).json({ success: false, message: "File URL not available" })
    }

    // Increment download count
    material.downloadCount = (material.downloadCount || 0) + 1
    await material.save()

    // For Cloudinary files, redirect to the URL with attachment flag
    if (material.cloudinaryUrl) {
      // Add attachment parameter to force download
      const downloadUrl = material.cloudinaryUrl.includes('?') 
        ? `${material.cloudinaryUrl}&fl_attachment=true`
        : `${material.cloudinaryUrl}?fl_attachment=true`;
      
      return res.redirect(downloadUrl);
    }

    // Fallback to local file storage (for backward compatibility)
    const absolutePath = path.resolve(material.filePath)
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, message: "File not found on server" })
    }

    res.download(absolutePath, material.originalName)
  } catch (error) {
    console.error("Error downloading material:", error)
    res.status(500).json({ success: false, message: "Failed to download material" })
  }
})

module.exports = router;