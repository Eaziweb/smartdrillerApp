// models/University.js
const mongoose = require("mongoose");

const universitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    monthlyPrice: {
      type: Number,
      required: true,
      default: 2000, // NGN
    },
    semesterPrice: {
      type: Number,
      required: true,
      default: 6000, // NGN
    },
    semesterActive: {
      type: Boolean,
      default: false,
    },
    globalSubscriptionEnd: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("University", universitySchema);