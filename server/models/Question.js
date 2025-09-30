// models/Question.js
const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
  },
  // Cloudinary image fields
  cloudinaryUrl: {
    type: String,
    trim: true,
    default: null,
  },
  cloudinaryPublicId: {
    type: String,
    trim: true,
    default: null,
  },
  // Keep the old image field for backward compatibility
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
});

questionSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for image URL - returns Cloudinary URL if available, otherwise falls back to local path
questionSchema.virtual('imageUrl').get(function() {
  if (this.cloudinaryUrl) {
    return this.cloudinaryUrl;
  }
  if (this.image && this.image.startsWith('/uploads')) {
    return this.image;
  }
  return null;
});

module.exports = mongoose.model("Question", questionSchema);