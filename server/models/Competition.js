// models/Competition.js
const mongoose = require("mongoose")

const competitionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["upcoming", "active", "ended"],
      default: "upcoming",
    },
    requiredCourses: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    courses: [
      {
        courseCode: {
          type: String,
          required: true,
        },
        courseName: {
          type: String,
          required: true,
        },
        questionsToShow: {
          type: Number,
          default: 0,
        },
        timeAllowed: {
          type: Number,
          default: 0,
        },
        questionsCount: {
          type: Number,
          default: 0,
        },
      },
    ],
    questionsCount: {
      type: Number,
      default: 0,
    },
    instructions: {
      type: String,
      default: "",
    },
    graceMinutes: {
      type: Number,
      default: 30,
    },
    leaderboardDelay: {
      type: Number,
      default: 30,
    },
    totalParticipants: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
)

// Update status based on dates
competitionSchema.methods.updateStatus = function () {
  const now = new Date()
  if (now < this.startDate) {
    this.status = "upcoming"
  } else if (now >= this.startDate && now <= this.endDate) {
    this.status = "active"
  } else {
    this.status = "ended"
  }
  return this.save()
}

// Update course questions count
competitionSchema.methods.updateCourseQuestionsCount = async function (courseCode) {
  const course = this.courses.find(c => c.courseCode === courseCode)
  if (!course) return
  
  // Use mongoose.model to avoid circular dependency
  const CompetitionQuestion = mongoose.model("CompetitionQuestion")
  const count = await CompetitionQuestion.countDocuments({
    competitionId: this._id,
    courseCode
  })
  
  course.questionsCount = count
  return this.save()
}

module.exports = mongoose.model("Competition", competitionSchema)