// models/StudyProgress.js
const mongoose = require("mongoose");
const studyProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  course: {
    type: String,
    required: true,
    lowercase: true,
  },
  year: {
    type: String,
    required: true,
  },
  studiedQuestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure one record per user per course per year
studyProgressSchema.index({ user: 1, course: 1, year: 1 }, { unique: true });

// Update the updatedAt field before saving
studyProgressSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.models.StudyProgress || mongoose.model("StudyProgress", studyProgressSchema);