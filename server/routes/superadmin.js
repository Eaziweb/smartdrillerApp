const express = require("express")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const Payment = require("../models/Payment")
const Settings = require("../models/Settings")
const CourseofStudy = require("../models/CourseofStudy")
const bcrypt = require("bcryptjs")
const router = express.Router()

// SuperAdmin Login
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
      const superadminCourse = await CourseofStudy.findOne({ 
        name: "SuperAdministration", 
        category: "Administration" 
      });
      
      if (!superadminCourse) {
        // If course doesn't exist, create it
        superadminCourse = new CourseofStudy({
          name: "SuperAdministration",
          category: "Administration"
        });
        await superadminCourse.save();
        console.log("SuperAdministration course created");
      }
      
      // Create superadmin with course
      const hashedPassword = await bcrypt.hash(password, 10);
      superadmin = new User({
        fullName: "Super Administrator",
        email,
        password: hashedPassword,
        course: superadminCourse._id,
        role: "superadmin",
        isEmailVerified: true,
      })
      await superadmin.save()
      console.log("SuperAdmin user created")
    } else {
      // Check password
      const isMatch = await superadmin.comparePassword(password)
      if (!isMatch) {
        // If password doesn't match, update it with the correct one
        const hashedPassword = await bcrypt.hash(password, 10);
        superadmin.password = hashedPassword;
        await superadmin.save()
        console.log("SuperAdmin password updated")
      }
      
      // Ensure superadmin has the correct course assigned
      const superadminCourse = await CourseofStudy.findOne({ 
        name: "SuperAdministration", 
        category: "Administration" 
      });
      
      if (superadminCourse && (!superadmin.course || superadmin.course.toString() !== superadminCourse._id.toString())) {
        superadmin.course = superadminCourse._id;
        await superadmin.save();
        console.log("SuperAdmin course updated");
      }
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
    res.status(500).json({ message: "Server error", error: error.message })
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
    
    // Find or create the Administration course
    let adminCourse = await CourseofStudy.findOne({ 
      name: "Administration", 
      category: "Administration" 
    });
    
    if (!adminCourse) {
      // If course doesn't exist, create it
      adminCourse = new CourseofStudy({
        name: "Administration",
        category: "Administration"
      });
      await adminCourse.save();
      console.log("Administration course created");
    }
  
const admin = new User({
  fullName,
  email,
  password, 
  role: "admin",
  course: adminCourse._id,
  isEmailVerified: true,
});
await admin.save();

    
    // Populate the course for the response
    await admin.populate('course', 'name');
    
    res.status(201).json({
      message: "Admin created successfully",
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        course: admin.course,
      },
    })
  } catch (error) {
    console.error("Error creating admin:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Get all Admins
router.get("/admins", async (req, res) => {
  try {
    // First get all admins without populating course
    const admins = await User.find({ role: "admin" }).select("-password");
    
    // Then manually populate course for each admin that has one
    const populatedAdmins = await Promise.all(admins.map(async (admin) => {
      if (admin.course) {
        try {
          const course = await CourseofStudy.findById(admin.course).select('name');
          return {
            ...admin.toObject(),
            course: course ? { name: course.name } : null
          };
        } catch (err) {
          console.error(`Error populating course for admin ${admin._id}:`, err);
          return {
            ...admin.toObject(),
            course: null
          };
        }
      } else {
        return {
          ...admin.toObject(),
          course: null
        };
      }
    }));
    
    res.json(populatedAdmins);
  } catch (error) {
    console.error("Error fetching admins:", error)
    res.status(500).json({ message: "Server error", error: error.message })
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
    console.error("Error deleting admin:", error)
    res.status(500).json({ message: "Server error", error: error.message })
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
    console.error("Error fetching revenue:", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
});

module.exports = router