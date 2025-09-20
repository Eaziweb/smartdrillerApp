const mongoose = require("mongoose");

const courseofStudySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// Create a compound unique index on name and category
courseofStudySchema.index({ name: 1, category: 1 }, { unique: true });

module.exports = mongoose.model("CourseofStudy", courseofStudySchema);