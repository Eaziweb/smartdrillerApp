// models/Video.js
const mongoose = require("mongoose")
const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  url: {
    type: String,
    required: true,
    trim: true,
  },
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "VideoTopic",
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "VideoCourse",
    required: true,
  },
  duration: {
    type: String, // Format: "MM:SS"
    default: "0:00",
  },
  views: {
    type: Number,
    default: 0,
  },
  likes: {
    type: Number,
    default: 0,
  },
  lastMetadataUpdate: {
    type: Date,
    default: Date.now,
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
videoSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})
module.exports = mongoose.model("Video", videoSchema)