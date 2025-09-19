// models/VideoCourse.js
const mongoose = require("mongoose")
const videoCourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  topics: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VideoTopic",
    },
  ],
  isVisible: {
    type: Boolean,
    default: true,
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

videoCourseSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model("VideoCourse", videoCourseSchema)