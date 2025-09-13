const mongoose = require("mongoose")

const settingsSchema = new mongoose.Schema(
  {
    subscriptionEndDate: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
    subscriptionPrice: {
      type: Number,
      default: 2000, // NGN
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Settings", settingsSchema)
