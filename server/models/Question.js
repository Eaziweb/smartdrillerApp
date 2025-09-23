// models/Question.js
const mongoose = require("mongoose")
const questionSchema = new mongoose.Schema({
  
  question: {
    type: String,
    required: true,
    trim: true,
  },
  image: {
    type: String,
    trim: true,
    default: null,
  },
  options: [
    {
      type: String,
      required: true,
    },
  ],
  correctOption: {
    type: Number,
    required: true,
    min: 1,
    max: 4,
  },
  explanation: {
    type: String,
    required: true,
    trim: true,
  },
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
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
  topic: {
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
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  importId: {
    type: String,
    index: true,
  },
  importStatus: {
    type: String,
    enum: ['pending', 'active'],
    default: 'active',
  },
})
questionSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})
module.exports = mongoose.model("Question", questionSchema)