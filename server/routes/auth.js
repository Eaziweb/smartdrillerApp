const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { auth } = require("../middleware/auth");
const emailService = require("../utils/emailService"); // Import our new email service

const router = express.Router();

// Helper function to generate 6-digit code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, course, university } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // If user is verified, return error
      if (existingUser.isEmailVerified) {
        return res.status(400).json({ message: "User already exists" });
      }

      // If user is unverified, overwrite and resend verification
      try {
        const verificationCode = await existingUser.overwriteUnverifiedUser({
          fullName,
          password,
          course,
          university
        });

        // Send verification email using new email service
        await emailService.sendEmail({
          to: email,
          subject: "Verify Your SmartDriller Account",
          html: `
            <h2>Welcome to SmartDriller!</h2>
            <p>Your verification code is: <strong style="font-size: 24px; background: #f0f0f0; padding: 8px; border-radius: 4px;">${verificationCode}</strong></p>
            <p>This code expires in 1 hour.</p>
            <p>If you didn't create an account, please ignore this email.</p>
          `,
        });

        return res.status(200).json({
          success: true,
          message: "Registration successful. Please check your email for the verification code.",
        });
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }

    // Create new user if none exists
    const verificationCode = generateVerificationCode();

    const user = new User({
      fullName,
      email,
      password,
      course,
      university,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: Date.now() + 3600000, // 1 hour
    });

    await user.save();

    // Send verification email using new email service
    await emailService.sendEmail({
      to: email,
      subject: "Verify Your SmartDriller Account",
      html: `
        <h2>Welcome to SmartDriller!</h2>
        <p>Your verification code is: <strong style="font-size: 24px; background: #f0f0f0; padding: 8px; border-radius: 4px;">${verificationCode}</strong></p>
        <p>This code expires in 1 hour.</p>
        <p>If you didn't create an account, please ignore this email.</p>
      `,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully. Please check your email for the verification code.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error.message.includes('email accounts have reached their daily sending limit')) {
      res.status(503).json({ 
        message: "Email service temporarily unavailable. Please try again later." 
      });
    } else {
      res.status(500).json({ message: "Server error" });
    }
  }
});

// Verify email code
router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;

    // Find user by email and verification code
    const user = await User.findOne({
      email,
      emailVerificationCode: code,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code"
      });
    }

    // Update user verification status
    user.isEmailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({
      success: true,
      message: "Email verified successfully"
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// Resend verification code
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified"
      });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send verification email using new email service
    await emailService.sendEmail({
      to: email,
      subject: "Resend Verification Code - SmartDriller",
      html: `
        <h2>Your New Verification Code</h2>
        <p>Your verification code is: <strong style="font-size: 24px; background: #f0f0f0; padding: 8px; border-radius: 4px;">${verificationCode}</strong></p>
        <p>This code expires in 1 hour.</p>
      `,
    });

    res.json({
      success: true,
      message: "Verification code resent successfully"
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    if (error.message.includes('email accounts have reached their daily sending limit')) {
      res.status(503).json({ 
        success: false,
        message: "Email service temporarily unavailable. Please try again later." 
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to resend verification code"
      });
    }
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;

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

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({
        message: "Please verify your email first",
        requiresVerification: true
      });
    }

    // Check if device is trusted
    const isDeviceTrusted = user.trustedDevices.some(
      device => device.deviceId === deviceId
    );

    if (isDeviceTrusted) {
      // Update last used time
      await User.updateOne(
        { _id: user._id, "trustedDevices.deviceId": deviceId },
        { $set: { "trustedDevices.$.lastUsed": new Date() } }
      );

      // Generate token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
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
    }

    // Device not trusted - generate OTP
    const otp = generateVerificationCode();
    user.deviceOTP = otp;
    user.deviceOTPExpires = Date.now() + 600000; // 10 minutes
    await user.save();

    // Send OTP email using new email service
    await emailService.sendEmail({
      to: email,
      subject: "Device Verification - SmartDriller",
      html: `
        <h2>New Device Sign In</h2>
        <p>We detected a sign in from a new device. Your verification code is:
        <strong style="font-size: 24px; background: #f0f0f0; padding: 8px; border-radius: 4px;">${otp}</strong>
        </p>
        <p>This code expires in 10 minutes.</p>
        <p>If you didn't try to sign in, please secure your account.</p>
      `,
    });

    res.status(200).json({
      requiresDeviceOTP: true,
      message: "Verification code sent to your email"
    });
  } catch (error) {
    console.error("Login error:", error);
    if (error.message.includes('email accounts have reached their daily sending limit')) {
      res.status(503).json({ 
        message: "Email service temporarily unavailable. Please try again later." 
      });
    } else {
      res.status(500).json({ message: "Server error" });
    }
  }
});

// Verify device OTP route
router.post("/verify-device-otp", async (req, res) => {
  try {
    const { email, otp, deviceName, deviceId } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify OTP
    if (user.deviceOTP !== otp || user.deviceOTPExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    // Check device limit
    if (user.trustedDevices.length >= user.maxDevices) {
      return res.status(400).json({
        message: `You've reached the maximum number of trusted devices (${user.maxDevices}). Please remove a device first.`,
        deviceLimitReached: true
      });
    }

    // Check if device ID already exists
    const existingDeviceIndex = user.trustedDevices.findIndex(
      device => device.deviceId === deviceId
    );

    if (existingDeviceIndex !== -1) {
      // Update existing device
      user.trustedDevices[existingDeviceIndex].deviceName = deviceName || "Unknown Device";
      user.trustedDevices[existingDeviceIndex].lastUsed = new Date();
    } else {
      // Add new device to trusted devices
      user.trustedDevices.push({
        deviceId,
        deviceName: deviceName || "Unknown Device",
        lastUsed: new Date()
      });
    }

    // Clear OTP
    user.deviceOTP = null;
    user.deviceOTPExpires = null;
    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    // Return token and user data for immediate login
    res.json({
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
    console.error("Device OTP verification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user's trusted devices
router.get("/devices", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('trustedDevices');
    res.json({ devices: user.trustedDevices });
  } catch (error) {
    console.error("Get devices error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Remove a trusted device by deviceId
router.delete("/devices/:deviceId", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.trustedDevices = user.trustedDevices.filter(
      device => device.deviceId !== req.params.deviceId
    );
    await user.save();
    res.json({ message: "Device removed successfully" });
  } catch (error) {
    console.error("Remove device error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin login
router.post("/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Admin login attempt for:", email);

    // Find admin user
    const admin = await User.findOne({ email, role: "admin" });
    if (!admin) {
      console.log("Admin not found with email:", email);
      return res.status(400).json({ message: "Invalid admin credentials" });
    }

    console.log("Admin found:", admin.email);

    // Check password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      console.log("Password mismatch for admin:", email);
      return res.status(400).json({ message: "Invalid admin credentials" });
    }

    console.log("Password matched for admin:", email);

    const token = jwt.sign({ userId: admin._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    return res.json({
      token,
      user: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// SuperAdmin Login
router.post("/superadmin-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const superadmin = await User.findOne({ email, role: "superadmin" });
    if (!superadmin) {
      return res.status(400).json({ message: "Invalid superadmin credentials" });
    }

    const isMatch = await superadmin.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid superadmin credentials" });
    }

    const token = jwt.sign({ userId: superadmin._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    return res.json({
      token,
      user: {
        id: superadmin._id,
        fullName: superadmin.fullName,
        email: superadmin.email,
        role: superadmin.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Forgot Password
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

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    await emailService.sendEmail({
      to: email,
      subject: "Password Reset - SmartDriller",
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    res.json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Forgot password error:", error);
    if (error.message.includes('email accounts have reached their daily sending limit')) {
      res.status(503).json({ 
        message: "Email service temporarily unavailable. Please try again later." 
      });
    } else {
      res.status(500).json({ message: "Failed to send reset email" });
    }
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

// Get user profile
  router.get("/me", auth, async (req, res) => {
    try {
      // Populate university and course details
      const user = await User.findById(req.user._id)
        .populate('university')
        .populate('course')

      res.json({
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          course: user.course,
          university: user.university,
          phoneNumber: user.phoneNumber,
          accountNumber: user.accountNumber,
          bankName: user.bankName,
          isSubscribed: user.isSubscribed,
          subscriptionExpiry: user.subscriptionExpiry,
          subscriptionType: user.subscriptionType,
          isRecurring: user.isRecurring,
          remainingMonths: user.remainingMonths,
          nextPaymentDate: user.nextPaymentDate,
          role: user.role,
        },
      });
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Failed to fetch user data" })
    }
  });
  
module.exports = router;