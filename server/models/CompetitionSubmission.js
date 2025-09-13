const mongoose = require("mongoose")

const competitionSubmissionSchema = new mongoose.Schema(
  {
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Competition",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    selectedCourses: [
      {
        courseCode: String,
        courseName: String,
      },
    ],
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CompetitionQuestion",
        },
        selectedOption: Number,
        isCorrect: Boolean,
        courseCode: String,
      },
    ],
    totalQuestions: {
      type: Number,
      required: true,
    },
    correctAnswers: {
      type: Number,
      required: true,
    },
    totalScore: {
      type: Number,
      required: true,
    },
    courseScores: [
      {
        courseCode: String,
        courseName: String,
        totalQuestions: Number,
        correctAnswers: Number,
        score: Number,
      },
    ],
    timeUsed: {
      type: Number,
      required: true,
    },
    timeAllowed: {
      type: Number,
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    isGraceSubmission: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

// Compound index for unique user per competition
competitionSubmissionSchema.index({ competitionId: 1, userId: 1 }, { unique: true })

module.exports = mongoose.model("CompetitionSubmission", competitionSubmissionSchema)
