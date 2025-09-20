// routes/superadmin.js
const express = require("express")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const Payment = require("../models/Payment")
const Settings = require("../models/Settings")
const CourseofStudy = require("../models/CourseofStudy")
const bcrypt = require("bcryptjs")
const router = express.Router()

// SuperAdmin Login
// routes/superadmin.js
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body
    
    // First, check if the provided credentials match the environment variables
    if (email !== process.env.SUPERADMIN_EMAIL || password !== process.env.SUPERADMIN_PASSWORD) {
      return res.status(400).json({ message: "Invalid superadmin credentials" })
    }
    
    // Find or create superadmin user
    let superadmin = await User.findOne({ email, role: "superadmin" })
    
    if (!superadmin) {
      // Find the superadmin course
      const superadminCourse = await CourseofStudy.findOne({ name: "Super Administration" });
      
      if (!superadminCourse) {
        return res.status(500).json({ message: "Superadmin course not found" });
      }
      
      // Create superadmin with course
      superadmin = new User({
        fullName: "SuperAdmin",
        email,
        password,
        course: superadminCourse._id,
        role: "superadmin",
        isEmailVerified: true,
      })
      await superadmin.save()
      console.log("SuperAdmin user created")
    }
    
    // Check password
    const isMatch = await superadmin.comparePassword(password)
    if (!isMatch) {
      // If password doesn't match, update it with the correct one
      superadmin.password = password
      await superadmin.save()
      console.log("SuperAdmin password updated")
    }
    
    const token = jwt.sign({ userId: superadmin._id }, process.env.JWT_SECRET, { expiresIn: "7d" })
    return res.json({
      token,
      user: {
        id: superadmin._id,
        fullName: superadmin.fullName,
        email: superadmin.email,
        role: superadmin.role,
        course: superadmin.course,
      },
    })
  } catch (error) {
    console.error("SuperAdmin login error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create Admin
router.post("/admins", async (req, res) => {
  try {
    const { fullName, email, password } = req.body
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email })
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin with this email already exists" })
    }
    
    // Create admin without course (since it's optional for admin role)
    const admin = new User({
      fullName,
      email,
      password,
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
router.get("/admins", async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" })
      .select("-password")
      // Only populate course if it exists
      .populate({
        path: "course",
        select: "name"
      })
    res.json(admins)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete Admin
router.delete("/admins/:id", async (req, res) => {
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
router.get("/revenue", async (req, res) => {
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
});

// routes/auth.js
// Add this endpoint for superadmin users
router.get("/superadmin/me", auth, async (req, res) => {
  try {
    // For superadmin, we don't need to populate course and university
    const user = await User.findById(req.user._id).select("-password");

    res.json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isSubscribed: user.isSubscribed,
        subscriptionExpiry: user.subscriptionExpiry,
        subscriptionType: user.subscriptionType,
        isRecurring: user.isRecurring,
        remainingMonths: user.remainingMonths,
        nextPaymentDate: user.nextPaymentDate,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch superadmin data" });
  }
});

module.exports = router