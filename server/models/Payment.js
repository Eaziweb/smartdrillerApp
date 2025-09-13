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
    },
    flutterwaveRef: String,
    subscriptionExpiry: Date,
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Payment", paymentSchema)