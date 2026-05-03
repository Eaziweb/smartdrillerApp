const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { auth } = require("../middleware/auth");
// const emailService = require("../utils/emailService"); // Import our new email service
const CourseofStudy = require("../models/CourseofStudy")
const bcrypt = require("bcryptjs")
const router = express.Router();

// Helper function to generate 6-digit code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, course, university } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user with email verified by default
    const user = new User({
      fullName,
      email,
      password,
      course,
      university,
      isEmailVerified: true, // Set to true for now
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User registered successfully.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// Modify the login route to remove OTP verification
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate token without device verification
const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "10d" });
    return res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        course: user.course,
        isSubscribed: user.isSubscribed,
        subscriptionExpiry: user.subscriptionExpiry,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin login route
router.post("/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Admin login attempt for:", email);
    console.log("Password provided:", password ? "Yes" : "No");

    // Find admin user
    const admin = await User.findOne({ email, role: "admin" });
    if (!admin) {
      console.log("Admin not found with email:", email);
      return res.status(400).json({ message: "Invalid admin credentials" });
    }

    console.log("Admin found:", admin.email);
    console.log("Stored password hash:", admin.password);
    console.log("Password provided length:", password.length);
    
    // Check password
    const isMatch = await admin.comparePassword(password);
    console.log("Password comparison result:", isMatch);
    
    if (!isMatch) {
      console.log("Password mismatch for admin:", email);
      
      // For debugging: Let's try to manually compare
      try {
        const manualCompare = await bcrypt.compare(password, admin.password);
        console.log("Manual bcrypt compare result:", manualCompare);
      } catch (err) {
        console.error("Manual bcrypt compare error:", err);
      }
      
      return res.status(400).json({ message: "Invalid admin credentials" });
    }

    console.log("Password matched for admin:", email);

    // Issue token (no trustedDevice / OTP for admins)
const token = jwt.sign({ userId: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: "10d" });

    return res.json({
      token,
      user: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        course: admin.course,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Forgot Password
// Forgot Password - Modified to return token directly
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Return the token directly instead of sending email
    res.json({ 
      message: "Password reset token generated. Use this token to reset your password.",
      resetToken 
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Failed to generate reset token" });
  }
});

// Reset Password
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    // Validate token format
    if (!token || token.length !== 64) {
      return res.status(400).json({ message: "Invalid reset token format" });
    }

    // Find user by token and check expiration
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

// Verify Reset Token
router.get("/verify-reset-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length !== 64) {
      return res.status(400).json({ valid: false, message: "Invalid reset token format" });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ valid: false, message: "Invalid or expired reset token" });
    }

    res.json({ valid: true, message: "Token is valid" });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({ valid: false, message: "Failed to verify token" });
  }
});

router.get("/superadmin/me", auth, async (req, res) => {
  try {
    
    const user = await User.findById(req.user._id).select("-password");

    res.json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isSubscribed: user.isSubscribed,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch superadmin data" });
  }
});

router.get("/me", auth, async (req, res) => {
  try {

    const user = await User.findById(req.user._id).select("-password");

    if (user.role === "superadmin") {
      return res.json({
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
    }

    const populatedUser = await User.findById(req.user._id)
      .populate('university')
      .populate('course')
      .select("-password");

    res.json({
      user: {
        id: populatedUser._id,
        fullName: populatedUser.fullName,
        email: populatedUser.email,
        course: populatedUser.course,
        university: populatedUser.university,
        phoneNumber: populatedUser.phoneNumber,
        accountNumber: populatedUser.accountNumber,
        bankName: populatedUser.bankName,
        isSubscribed: populatedUser.isSubscribed,
        subscriptionExpiry: populatedUser.subscriptionExpiry,
        subscriptionType: populatedUser.subscriptionType,
        isRecurring: populatedUser.isRecurring,
        remainingMonths: populatedUser.remainingMonths,
        nextPaymentDate: populatedUser.nextPaymentDate,
        role: populatedUser.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch user data" });
  }
});

module.exports = router;