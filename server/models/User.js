// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      // Make university optional for admin/superadmin
      required: function() {
        return this.role === "user";
      },
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseofStudy", 
    
      required: function() {
        return this.role === "user";
      },
    },
    phoneNumber: {
      type: String,
      default: "",
    },
    accountNumber: {
      type: String,
      default: "",
    },
    bankName: {
      type: String,
      default: "",
    },
    lastNotificationView: {
      type: Date,
      default: null,
    },
    isSubscribed: {
      type: Boolean,
      default: false,
    },
    subscriptionExpiry: {
      type: Date,
      default: null,
    },
    universitySubscriptionEnd: {
      type: Date,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationCode: {
      type: String,
      default: null,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"], 
      default: "user",
    },
    subscriptionType: {
      type: String,
      enum: ["monthly", "semester"],
      default: "monthly",
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringMonths: {
      type: Number,
      default: 1,
    },
    remainingMonths: {
      type: Number,
      default: 0,
    },
    nextPaymentDate: {
      type: Date,
      default: null,
    },
trustedDevices: [
  {
    deviceId: { 
      type: String,
      required: function () {
        return this.role === "user";
      }
    },
    deviceName: { type: String, default: "Unknown Device" },
    lastUsed: { type: Date, default: Date.now }
  }
],

    deviceOTP: { type: String, default: null },
    deviceOTPExpires: { type: Date, default: null },
    maxDevices: { type: Number, default: 4 }
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.overwriteUnverifiedUser = async function(newUserData) {
  // Only allow overwrite if user is unverified
  if (this.isEmailVerified) {
    throw new Error("Cannot overwrite a verified user");
  }
  
  // Update user data
  this.fullName = newUserData.fullName;
  this.password = newUserData.password; // Will be hashed by pre-save hook
  this.course = newUserData.course; // Now storing ObjectId
  this.university = newUserData.university;
  
  // Generate new verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailVerificationCode = verificationCode;
  this.emailVerificationExpires = Date.now() + 3600000; // 1 hour
  
  await this.save();
  return verificationCode;
};

// Create the model
const User = mongoose.model("User", userSchema);

// Export the model
module.exports = User;    