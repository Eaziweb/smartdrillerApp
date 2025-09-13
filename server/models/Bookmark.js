const mongoose = require("mongoose")

const bookmarkSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    course: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

// Ensure unique user-question combinations
bookmarkSchema.index({ user: 1, question: 1 }, { unique: true })
bookmarkSchema.index({ user: 1, course: 1 })

module.exports = mongoose.model("Bookmark", bookmarkSchema)
