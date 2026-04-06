// routes/auth.js
const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { auth } = require("../middleware/auth");
const CourseofStudy = require("../models/CourseofStudy");
const {
  sendVerificationEmail,
  sendDeviceOTPEmail,
  sendPasswordResetEmail,
  sendResendVerificationEmail,
} = require("../utils/emailService");

const router = express.Router();

// Helper: generate 6-digit code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, course, university } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // If verified, reject
      if (existingUser.isEmailVerified) {
        return res.status(400).json({ message: "User already exists" });
      }

      // If unverified, overwrite and resend verification
      try {
        const verificationCode = await existingUser.overwriteUnverifiedUser({
          fullName,
          password,
          course,
          university,
        });

        await sendVerificationEmail(email, verificationCode);

        return res.status(200).json({
          success: true,
          message: "Registration successful. Please check your email for the verification code.",
        });
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }

    // Create new user
    const verificationCode = generateVerificationCode();

    const user = new User({
      fullName,
      email,
      password,
      course,
      university,
      isEmailVerified: false,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: Date.now() + 3600000, // 1 hour
    });

    await user.save();

    await sendVerificationEmail(email, verificationCode);

    res.status(201).json({
      success: true,
      message: "User registered successfully. Please check your email for the verification code.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ─────────────────────────────────────────────
// VERIFY EMAIL
// ─────────────────────────────────────────────
router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({
      email,
      emailVerificationCode: code,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─────────────────────────────────────────────
// RESEND VERIFICATION CODE
// ─────────────────────────────────────────────
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified" });
    }

    const verificationCode = generateVerificationCode();
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = Date.now() + 3600000;
    await user.save();

    await sendResendVerificationEmail(email, verificationCode);

    res.json({ success: true, message: "Verification code resent successfully" });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ success: false, message: "Failed to resend verification code" });
  }
});

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isEmailVerified) {
      return res.status(401).json({
        message: "Please verify your email first",
        requiresVerification: true,
      });
    }

    // Check if device is trusted
    const isDeviceTrusted = user.trustedDevices.some(
      (device) => device.deviceId === deviceId
    );

    if (isDeviceTrusted) {
      // Update last used
      await User.updateOne(
        { _id: user._id, "trustedDevices.deviceId": deviceId },
        { $set: { "trustedDevices.$.lastUsed": new Date() } }
      );

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

    // New device — send OTP
    const otp = generateVerificationCode();
    user.deviceOTP = otp;
    user.deviceOTPExpires = Date.now() + 600000; // 10 minutes
    await user.save();

    await sendDeviceOTPEmail(email, otp);

    res.status(200).json({
      requiresDeviceOTP: true,
      message: "Verification code sent to your email",
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ─────────────────────────────────────────────
// VERIFY DEVICE OTP
// ─────────────────────────────────────────────
router.post("/verify-device-otp", async (req, res) => {
  try {
    const { email, otp, deviceName, deviceId } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.deviceOTP !== otp || user.deviceOTPExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    if (user.trustedDevices.length >= user.maxDevices) {
      return res.status(400).json({
        message: `You've reached the maximum number of trusted devices (${user.maxDevices}). Please remove a device first.`,
        deviceLimitReached: true,
      });
    }

    const existingDeviceIndex = user.trustedDevices.findIndex(
      (device) => device.deviceId === deviceId
    );

    if (existingDeviceIndex !== -1) {
      user.trustedDevices[existingDeviceIndex].deviceName = deviceName || "Unknown Device";
      user.trustedDevices[existingDeviceIndex].lastUsed = new Date();
    } else {
      user.trustedDevices.push({
        deviceId,
        deviceName: deviceName || "Unknown Device",
        lastUsed: new Date(),
      });
    }

    user.deviceOTP = null;
    user.deviceOTPExpires = null;
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

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

// ─────────────────────────────────────────────
// GET TRUSTED DEVICES
// ─────────────────────────────────────────────
router.get("/devices", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("trustedDevices");
    res.json({ devices: user.trustedDevices });
  } catch (error) {
    console.error("Get devices error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ─────────────────────────────────────────────
// REMOVE TRUSTED DEVICE
// ─────────────────────────────────────────────
router.delete("/devices/:deviceId", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.trustedDevices = user.trustedDevices.filter(
      (device) => device.deviceId !== req.params.deviceId
    );
    await user.save();
    res.json({ message: "Device removed successfully" });
  } catch (error) {
    console.error("Remove device error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ─────────────────────────────────────────────
// ADMIN LOGIN
// ─────────────────────────────────────────────
router.post("/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await User.findOne({ email, role: "admin" });
    if (!admin) {
      return res.status(400).json({ message: "Invalid admin credentials" });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid admin credentials" });
    }

    const token = jwt.sign(
      { userId: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

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

// ─────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    await sendPasswordResetEmail(email, resetToken);

    res.json({ success: true, message: "Password reset link sent to your email." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Failed to send reset email" });
  }
});

// ─────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    if (!token || token.length !== 64) {
      return res.status(400).json({ message: "Invalid reset token format" });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

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

// ─────────────────────────────────────────────
// VERIFY RESET TOKEN
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// GET CURRENT USER (/me)
// ─────────────────────────────────────────────
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
      .populate("university")
      .populate("course")
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