const express = require("express");
const router = express.Router();
const Material = require("../../models/Material");
const { adminAuth } = require("../../middleware/auth");
const cloudinary = require("../../config/cloudinary");

// List materials
router.get("/", adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", course = "", type = "", status = "" } = req.query;
    const query = {};
    if (search) query.$or = [{ title: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }];
    if (course) query.course = course;
    if (type) query.fileType = type;
    if (status) query.isApproved = status === "approved";

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

// Approve
router.put("/:id/approve", adminAuth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: "Material not found" });
    material.isApproved = true;
    material.rejectionReason = "";
    await material.save();
    res.json({ success: true, message: "Material approved" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to approve" });
  }
});

// Reject (delete)
router.put("/:id/reject", adminAuth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: "Material not found" });
    if (material.cloudinaryPublicId) await cloudinary.uploader.destroy(material.cloudinaryPublicId, { resource_type: "raw" });
    await Material.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Material rejected and deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to reject" });
  }
});
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: "Material not found" });

    if (material.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(material.cloudinaryPublicId, { resource_type: "raw" });
      } catch (err) {
        console.error("Cloudinary delete error:", err);
      }
    }

    await Material.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Material deleted successfully" });
  } catch (error) {
    console.error("Error deleting material:", error);
    res.status(500).json({ success: false, message: "Failed to delete material" });
  }
});

router.get("/:id/download", adminAuth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: "Material not found" });

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
