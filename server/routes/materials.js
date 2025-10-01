const express = require("express");
const router = express.Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const { auth } = require("../middleware/auth");
const Material = require("../models/Material");
const Course = require("../models/Course");

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const ext = file.originalname.split(".").pop().toLowerCase();
    const filename = file.originalname.replace(/\.[^/.]+$/, "");
    return {
      folder: "materials",
      public_id: `${Date.now()}-${filename}`,
      resource_type: "raw",
      format: ext,
      flags: "attachment",
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["pdf", "docx", "ppt"];
    const ext = file.originalname.split(".").pop().toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error("Only PDF, DOCX, PPT allowed"));
  },
});

router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    const { title, description, course } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: "File is required" });

    const fileExtension = req.file.originalname.split(".").pop().toLowerCase();

    // Extract version from Cloudinary URL
    const versionMatch = req.file.path.match(/\/v(\d+)\//);
    const version = versionMatch ? versionMatch[1] : null;

    const material = new Material({
      title,
      description,
      cloudinaryUrl: req.file.path,
      cloudinaryPublicId: req.file.filename,
      cloudinaryVersion: version,   // ✅ fixed
      originalName: req.file.originalname,
      fileSize: req.file.size,
      fileType: fileExtension,
      course,
      uploadedBy: req.user.id,
      isApproved: false,
    });

    await material.save();
    res.json({ success: true, message: "Uploaded (pending approval)", material });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to upload" });
  }
});



router.get("/courses", auth, async (req, res) => {
  try {
    const courses = await Course.find({}, "courseName courseCode").sort({ courseName: 1 });
    res.json({ success: true, courses });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ success: false, message: "Failed to fetch courses" });
  }
});

// List approved
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 12, search = "", course = "", type = "" } = req.query;
    const query = { isApproved: true };

    if (search) query.$or = [{ title: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }];
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
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch materials" });
  }
});

router.get("/:id/download", auth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: "Material not found" });

    // Generate the download URL with proper parameters
    const url = cloudinary.url(material.cloudinaryPublicId, {
      resource_type: "raw",
      version: material.cloudinaryVersion, 
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 300,
      attachment: material.originalName,
    });

    res.json({ success: true, url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to download" });
  }
});

module.exports = router;
