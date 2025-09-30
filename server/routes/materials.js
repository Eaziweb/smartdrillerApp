const express = require("express");
const router = express.Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const { auth } = require("../middleware/auth");
const Material = require("../models/Material");
const Course = require("../models/Course");

// ==========================
// Multer + Cloudinary storage
// ==========================
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const ext = file.originalname.split(".").pop().toLowerCase();
    return {
      folder: "materials",
      public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "")}`,
      resource_type: "raw",
      format: ext,
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = ["pdf", "docx", "ppt"];
    const ext = file.originalname.split(".").pop().toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error("Only PDF, DOCX, PPT allowed"));
  },
});

// ==========================
// Get all approved materials
// ==========================
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 12, search = "", course = "", type = "" } = req.query;
    const query = { isApproved: true };

    if (search) query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
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

// ==========================
// Get courses for dropdown
// ==========================
router.get("/courses", auth, async (req, res) => {
  try {
    const courses = await Course.find({}, "courseName courseCode").sort({ courseName: 1 });
    res.json({ success: true, courses });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ success: false, message: "Failed to fetch courses" });
  }
});

// ==========================
// Upload material
// ==========================
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    const { title, description, course } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: "File is required" });

    const fileExtension = req.file.originalname.split(".").pop().toLowerCase();

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
      material,
    });
  } catch (error) {
    console.error("Error uploading material:", error);
    res.status(500).json({ success: false, message: "Failed to upload material" });
  }
});

// ==========================
// Download material
// ==========================
router.get("/:id/download", auth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: "Material not found" });

    if (!material.cloudinaryPublicId) {
      return res.status(404).json({ success: false, message: "File not available" });
    }

    // ✅ Generate signed URL for raw file download
    const downloadUrl = cloudinary.utils.private_download_url(
      material.cloudinaryPublicId,
      process.env.CLOUDINARY_API_SECRET,
      { attachment: material.originalName } // forces browser to download
    );

    res.json({ success: true, url: downloadUrl });
  } catch (error) {
    console.error("Error downloading material:", error);
    res.status(500).json({ success: false, message: "Failed to download material" });
  }
});

module.exports = router;
