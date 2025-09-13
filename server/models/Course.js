const mongoose = require("mongoose")

const courseSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true,
  },
  courseName: {
    type: String,
    required: true,
    trim: true,
  },
  semester: {
    type: String,
    required: true,
    enum: ['first', 'second'],
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
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  
})

courseSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model("Course", courseSchema)