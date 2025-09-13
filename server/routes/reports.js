const express = require("express")
const Report = require("../models/Report")
const { auth, adminAuth } = require("../middleware/auth")

const router = express.Router()

// Submit question report
router.post("/submit", auth, async (req, res) => {
  try {
    if (!req.user.isSubscribed) {
      return res.status(403).json({ message: "Subscription required" })
    }

    const { questionId, description } = req.body

    const report = new Report({
      user: req.user._id,
      question: questionId,
      description,
    })

    await report.save()

    res.status(201).json({
      message: "Report submitted successfully",
      report,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Admin: Get all reports (matches frontend /api/reports)
router.get("/", adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query

    const query = {}
    if (status && status !== "") {
      query.status = status
    }

    const skip = (page - 1) * limit
    const reports = await Report.find(query)
      .populate("user", "fullName email")
      .populate("question", "question course year topic")
      .populate("reviewedBy", "fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await Report.countDocuments(query)

    res.json({
      reports,
      pagination: {
        current: Number.parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    })
  } catch (error) {
    console.error("Error fetching reports:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Admin: Update report status (matches frontend /api/reports/:id/status)
router.put("/:id/status", adminAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const updateData = {
      status,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
    }

    const report = await Report.findByIdAndUpdate(id, updateData, { new: true })
      .populate("user", "fullName email")
      .populate("question", "question course year topic")

    if (!report) {
      return res.status(404).json({ message: "Report not found" })
    }

    res.json({
      message: "Report status updated successfully",
      report,
    })
  } catch (error) {
    console.error("Error updating report status:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Admin: Delete report (matches frontend DELETE /api/reports/:id)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params

    const report = await Report.findByIdAndDelete(id)

    if (!report) {
      return res.status(404).json({ message: "Report not found" })
    }

    res.json({
      message: "Report deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting report:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Keep the original admin routes for backwards compatibility
router.get("/admin", adminAuth, async (req, res) => {
  try {
    const { status = "all", page = 1, limit = 20 } = req.query

    const query = {}
    if (status !== "all") {
      query.status = status
    }

    const skip = (page - 1) * limit
    const reports = await Report.find(query)
      .populate("user", "fullName email")
      .populate("question", "question course year topic")
      .populate("reviewedBy", "fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await Report.countDocuments(query)

    res.json({
      reports,
      pagination: {
        current: Number.parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

router.put("/admin/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { status, adminNotes } = req.body

    const updateData = {
      status,
      adminNotes,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
    }

    const report = await Report.findByIdAndUpdate(id, updateData, { new: true })
      .populate("user", "fullName email")
      .populate("question", "question course year topic")

    if (!report) {
      return res.status(404).json({ message: "Report not found" })
    }

    res.json({
      message: "Report updated successfully",
      report,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router