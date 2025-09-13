const mongoose = require("mongoose")

const userProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  completedNotes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
    },
  ],
  videoProgress: [
    {
      video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
      progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      lastWatched: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

userProgressSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model("UserProgress", userProgressSchema)
