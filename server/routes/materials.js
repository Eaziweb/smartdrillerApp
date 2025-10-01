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
  params: async (req, file) => {
    const ext = file.originalname.split(".").pop().toLowerCase();
    const timestamp = Date.now();
    const filename = file.originalname.replace(/\.[^/.]+$/, "");
    
    return {
      folder: "materials",
      public_id: `${timestamp}-${filename}`,
      resource_type: "raw",
      format: ext,
      type: "upload",
      // Add attachment flag during upload
      flags: "attachment",
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

router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    const { title, description, course } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, message: "File is required" });
    }

    console.log("Cloudinary upload result:", req.file);

    const fileExtension = req.file.originalname.split(".").pop().toLowerCase();

    // Remove extension from public_id
    const publicIdWithoutExt = req.file.filename.replace(/\.[^/.]+$/, "");

    const material = new Material({
      title,
      description,
      cloudinaryUrl: req.file.path,              // full CDN URL
      cloudinaryPublicId: publicIdWithoutExt,    // correct public_id without extension
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

// For both routes/materials.js and routes/admin/materials.js
router.get("/:id/download", auth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: "Material not found" });
    if (!material.cloudinaryPublicId) return res.status(404).json({ success: false, message: "File not available" });

    console.log("Downloading material:", material.cloudinaryPublicId);

    // Generate proper download URL
    const downloadUrl = cloudinary.url(material.cloudinaryPublicId, {
      resource_type: "raw",
      format: material.fileType,
      flags: "attachment",
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 300, // 5 min expiry
      transformation: [
        { 
          flags: `attachment:${material.originalName}` 
        }
      ]
    });

    res.json({ success: true, url: downloadUrl });
  } catch (error) {
    console.error("Error downloading material:", error);
    res.status(500).json({ success: false, message: "Failed to download material" });
  }
});



module.exports = router;
