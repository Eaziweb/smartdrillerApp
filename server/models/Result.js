const mongoose = require("mongoose")

const resultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    examType: {
      type: String,
      enum: ["mock"],
      required: true,
    },
    course: {
      type: String,
      required: true,
    },
    year: {
      type: String,
      required: true,
    },
    topics: {
      type: [String],
      default: [],
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    answeredQuestions: {
      type: Number,
      required: true,
    },
    correctAnswers: {
      type: Number,
      required: true,
    },
    wrongAnswers: {
      type: Number,
      required: true,
    },
    unansweredQuestions: {
      type: Number,
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    percentage: {
      type: Number,
      required: true,
    },
    grade: {
      type: String,
      required: true,
    },
    timeAllowed: {
      type: Number, // in minutes
      required: true,
    },
    timeUsed: {
      type: Number, // in minutes
      required: true,
    },
    questions: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
          required: true,
        },
        selectedOption: {
          type: Number,
          min: 0, // 0 means unanswered
          max: 4,
        },
        isCorrect: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
)

resultSchema.index({ user: 1, createdAt: -1 })
resultSchema.index({ user: 1, course: 1 })

module.exports = mongoose.model("Result", resultSchema)
