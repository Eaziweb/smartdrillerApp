const mongoose = require("mongoose")

const courseYearSchema = new mongoose.Schema({
  course: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  year: {
    type: String,
    required: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Ensure unique course-year combinations
courseYearSchema.index({ course: 1, year: 1 }, { unique: true })

module.exports = mongoose.model("CourseYear", courseYearSchema)