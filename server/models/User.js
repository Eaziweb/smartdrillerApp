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
    course: {
      type: String,
      required: true,
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
    isSubscribed: {
      type: Boolean,
      default: false,
    },
    subscriptionExpiry: {
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
    trustedDevices: [
      {
        deviceId: { 
          type: String, 
          required: true,
          unique: true // Ensure device IDs are globally unique
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

module.exports = mongoose.model("User", userSchema);