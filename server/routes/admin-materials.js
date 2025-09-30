// routes/admin-materials.js
const express = require("express");
const router = express.Router();
const { adminAuth } = require("../middleware/auth");
const Material = require("../models/Material");
const { cloudinary } = require("../config/cloudinary");

// Get all materials (with filters)
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

    // Format materials to include uploaderName
    const formattedMaterials = materials.map(material => ({
      ...material.toObject(),
      uploaderName: material.uploadedBy?.fullName || "Unknown"
    }));

    res.json({
      success: true,
      materials: formattedMaterials,
      currentPage: Number(page),
      totalPages,
      total,
    });
  } catch (error) {
    console.error("Error fetching materials:", error);
    res.status(500).json({ success: false, message: "Failed to fetch materials" });
  }
});

// Approve material - move file to approved folder
router.put("/:id/approve", adminAuth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    // Move file from pending to approved folder
    const oldPublicId = material.cloudinaryPublicId;
    const newPublicId = oldPublicId.replace('materials/pending/', 'materials/approved/');
    
    try {
      await cloudinary.uploader.rename(oldPublicId, newPublicId, { 
        resource_type: "raw" 
      });
    } catch (renameError) {
      console.error("Error renaming file in Cloudinary:", renameError);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to move file to approved folder" 
      });
    }
    
    // Update material with new path
    material.cloudinaryPublicId = newPublicId;
    material.cloudinaryUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/${newPublicId}`;
    material.isApproved = true;
    material.rejectionReason = "";
    
    await material.save();

    res.json({ success: true, message: "Material approved successfully" });
  } catch (error) {
    console.error("Error approving material:", error);
    res.status(500).json({ success: false, message: "Failed to approve material" });
  }
});

// Reject material - delete from Cloudinary and DB
router.put("/:id/reject", adminAuth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    // Delete from Cloudinary if it exists
    if (material.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(material.cloudinaryPublicId, { 
          resource_type: "raw" 
        });
      } catch (deleteError) {
        console.error("Error deleting from Cloudinary:", deleteError);
        // Continue with DB deletion even if Cloudinary deletion fails
      }
    }

    // Delete from database
    await Material.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Material rejected and deleted successfully" });
  } catch (error) {
    console.error("Error rejecting material:", error);
    res.status(500).json({ success: false, message: "Failed to reject material" });
  }
});

// Delete material - delete from Cloudinary and DB
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    // Delete from Cloudinary if it exists
    if (material.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(material.cloudinaryPublicId, { 
          resource_type: "raw" 
        });
      } catch (deleteError) {
        console.error("Error deleting from Cloudinary:", deleteError);
        // Continue with DB deletion even if Cloudinary deletion fails
      }
    }

    // Delete from database
    await Material.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Material deleted successfully" });
  } catch (error) {
    console.error("Error deleting material:", error);
    res.status(500).json({ success: false, message: "Failed to delete material" });
  }
});

// Download material
router.get("/:id/download", adminAuth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    if (!material.cloudinaryPublicId) {
      return res.status(404).json({ success: false, message: "File URL not available" });
    }

    // Generate a proper Cloudinary download URL using the SDK
    const downloadUrl = cloudinary.url(material.cloudinaryPublicId, {
      resource_type: 'raw',
      attachment: material.originalName,
      secure: true,
      sign_url: true
    });

    res.json({ success: true, url: downloadUrl });
  } catch (error) {
    console.error("Error downloading material:", error);
    res.status(500).json({ success: false, message: "Failed to download material" });
  }
});

module.exports = router;