// models/CompetitionQuestion.js
const mongoose = require("mongoose")

const competitionQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => v.length >= 2 && v.length <= 6,
        message: "Question must have between 2 and 6 options",
      },
    },
    correctOption: {
      type: Number,
      required: true,
      min: 1,
    },
    image: {
      type: String,
      default: "",
    },
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Competition",
      required: true,
    },
    courseCode: {
      type: String,
      required: true,
    },
    // Optional fields with defaults
    tags: {
      type: [String],
      default: [],
    },
    course: {
      type: String,
      default: "",
    },
    year: {
      type: String,
      default: "",
    },
    topic: {
      type: String,
      default: "",
    },
    explanation: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("CompetitionQuestion", competitionQuestionSchema)