// routes/admin-materials.js
const express = require("express")
const router = express.Router()
const fs = require("fs")
const { adminAuth } = require("../middleware/auth")
const Material = require("../models/Material")

// Get all materials for admin (including pending)
router.get("/", adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", course = "", type = "", status = "" } = req.query
    const query = {}
    
    if (search) {
      query.$or = [{ title: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }]
    }
    
    if (course) {
      query.course = course
    }
    
    if (type) {
      query.fileType = type
    }
    
    if (status) {
      query.isApproved = status === "approved"
    }
    
    const materials = await Material.find(query)
      .populate("course", "name")
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
      courseName: material.course?.name || "Unknown",
      uploaderName: material.uploadedBy?.fullName || "Unknown",
      downloadCount: material.downloadCount,
      isApproved: material.isApproved,
      rejectionReason: material.rejectionReason,
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

// Approve material
router.put("/:id/approve", adminAuth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id)
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material not found",
      })
    }
    
    material.isApproved = true
    material.rejectionReason = ""
    await material.save()
    
    res.json({
      success: true,
      message: "Material approved successfully",
    })
  } catch (error) {
    console.error("Error approving material:", error)
    res.status(500).json({
      success: false,
      message: "Failed to approve material",
    })
  }
})

// Reject material
router.put("/:id/reject", adminAuth, async (req, res) => {
  try {
    const { reason } = req.body
    const material = await Material.findById(req.params.id)
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material not found",
      })
    }
    
    // Delete file from filesystem
    if (fs.existsSync(material.filePath)) {
      fs.unlinkSync(material.filePath)
    }
    
    // Delete from database
    await Material.findByIdAndDelete(req.params.id)
    
    res.json({
      success: true,
      message: "Material rejected and deleted successfully",
    })
  } catch (error) {
    console.error("Error rejecting material:", error)
    res.status(500).json({
      success: false,
      message: "Failed to reject material",
    })
  }
})

// Delete material
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id)
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material not found",
      })
    }
    
    // Delete file from filesystem
    if (fs.existsSync(material.filePath)) {
      fs.unlinkSync(material.filePath)
    }
    
    // Delete from database
    await Material.findByIdAndDelete(req.params.id)
    
    res.json({
      success: true,
      message: "Material deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting material:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete material",
    })
  }
})

// Download material (admin)
router.get("/:id/download", adminAuth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id)
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material not found",
      })
    }
    
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