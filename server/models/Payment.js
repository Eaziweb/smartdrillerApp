const mongoose = require("mongoose");

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
    subscriptionType: {
      type: String,
      enum: ["monthly", "semester"],
      required: true,
    },
    meta: {
      isRecurring: {
        type: Boolean,
        default: false,
      },
      recurringMonths: {
        type: Number,
        default: 1,
      },
      paymentPlan: {
        type: String,
        enum: ["one-time", "recurring"],
        default: "one-time",
      },
      recurringPayment: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);