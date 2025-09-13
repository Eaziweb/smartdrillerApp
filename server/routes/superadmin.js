const express = require("express")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const Payment = require("../models/Payment")
const Settings = require("../models/Settings")
const { superAdminAuth } = require("../middleware/auth")
const router = express.Router()

// SuperAdmin Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body
    // Check if it's superadmin credentials
    if (email === process.env.SUPERADMIN_EMAIL && password === process.env.SUPERADMIN_PASSWORD) {
      // Find or create superadmin user
      let superadmin = await User.findOne({ email, role: "superadmin" })
      if (!superadmin) {
        superadmin = new User({
          fullName: "SuperAdmin",
          email,
          password,
          course: "Super Administration",
          role: "superadmin",
          isEmailVerified: true,
        })
        await superadmin.save()
      }
      const token = jwt.sign({ userId: superadmin._id }, process.env.JWT_SECRET, { expiresIn: "7d" })
      return res.json({
        token,
        user: {
          id: superadmin._id,
          fullName: superadmin.fullName,
          email: superadmin.email,
          role: superadmin.role,
        },
      })
    }
    res.status(400).json({ message: "Invalid superadmin credentials" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create Admin
router.post("/admins", superAdminAuth, async (req, res) => {
  try {
    const { fullName, email, password } = req.body
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email })
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin with this email already exists" })
    }
    // Create admin
    const admin = new User({
      fullName,
      email,
      password,
      course: "Administration",
      role: "admin",
      isEmailVerified: true,
    })
    await admin.save()
    res.status(201).json({
      message: "Admin created successfully",
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get all Admins
router.get("/admins", superAdminAuth, async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select("-password")
    res.json(admins)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete Admin
router.delete("/admins/:id", superAdminAuth, async (req, res) => {
  try {
    const admin = await User.findByIdAndDelete(req.params.id)
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" })
    }
    res.json({ message: "Admin deleted successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get Revenue
router.get("/revenue", superAdminAuth, async (req, res) => {
  try {
    const payments = await Payment.find({ status: "successful" })
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0)
    res.json({
      totalRevenue,
      payments,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update Subscription Price
router.put("/subscription-price", superAdminAuth, async (req, res) => {
  try {
    const { subscriptionPrice } = req.body
    let settings = await Settings.findOne()
    if (!settings) {
      settings = new Settings()
    }
    settings.subscriptionPrice = subscriptionPrice
    await settings.save()
    res.json({
      message: "Subscription price updated successfully",
      settings,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get Subscription Settings
router.get("/subscription-settings", superAdminAuth, async (req, res) => {
  try {
    let settings = await Settings.findOne()
    if (!settings) {
      settings = new Settings()
      await settings.save()
    }
    res.json(settings)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router