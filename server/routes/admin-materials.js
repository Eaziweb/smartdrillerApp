const express = require("express");
const router = express.Router();
const { adminAuth } = require("../middleware/auth");
const Material = require("../models/Material");
const cloudinary = require("../config/cloudinary");


router.get("/", adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", course = "", type = "", status = "" } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
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

    const formattedMaterials = materials.map((material) => ({
      ...material.toObject(),
      uploaderName: material.uploadedBy?.fullName || "Unknown",
    }));

    res.json({ success: true, materials: formattedMaterials, currentPage: Number(page), totalPages, total });
  } catch (error) {
    console.error("Error fetching materials:", error);
    res.status(500).json({ success: false, message: "Failed to fetch materials" });
  }
});

// ==========================
// Approve material
// ==========================
router.put("/:id/approve", adminAuth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: "Material not found" });

    material.isApproved = true;
    material.rejectionReason = "";
    await material.save();

    res.json({ success: true, message: "Material approved successfully" });
  } catch (error) {
    console.error("Error approving material:", error);
    res.status(500).json({ success: false, message: "Failed to approve material" });
  }
});

// ==========================
// Reject material (delete from Cloudinary + DB)
// ==========================
router.put("/:id/reject", adminAuth, async (req, res) => {
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
    res.json({ success: true, message: "Material rejected and deleted successfully" });
  } catch (error) {
    console.error("Error rejecting material:", error);
    res.status(500).json({ success: false, message: "Failed to reject material" });
  }
});

// ==========================
// Delete material (Cloudinary + DB)
// ==========================
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
    if (!material.cloudinaryPublicId) return res.status(404).json({ success: false, message: "File not available" });

    console.log("Downloading material:", material.cloudinaryPublicId);

    // Correct private download URL for raw files
    const downloadUrl = cloudinary.utils.private_download_url(
      material.cloudinaryPublicId,   // include folder (e.g., "materials/xxxx"), NO extension
      material.originalName,         // filename users will see
      {
        resource_type: "raw",
        attachment: true,
        expires_at: Math.floor(Date.now() / 1000) + 300, // 5 min expiry
      }
    );

    res.json({ success: true, url: downloadUrl });
  } catch (error) {
    console.error("Error downloading material:", error);
    res.status(500).json({ success: false, message: "Failed to download material" });
  }
});




module.exports = router;
