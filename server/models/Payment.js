const mongoose = require("mongoose")

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "NGN",
    },
    status: {
      type: String,
      enum: ["pending", "successful", "failed"],
      default: "pending",
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    flutterwaveRef: {
      type: String,
      required: false,
    },
    subscriptionType: {
      type: String,
      enum: ["monthly", "semester"],
      required: true,
    },
    meta: {
      months: {
        type: Number,
        default: 1,
      },
      paymentPlan: {
        type: String,
        enum: ["one-time"],
        default: "one-time",
      },
    },
    paidAt: Date,
    failedAt: Date,
    failureReason: String,
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Payment", paymentSchema)
