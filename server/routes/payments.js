const express = require("express");
const axios = require("axios");
const User = require("../models/User");
const University = require("../models/University");
const Payment = require("../models/Payment");
const { auth } = require("../middleware/auth");
const router = express.Router();

// Initialize payment using Flutterwave's hosted payment page
router.post("/initialize", auth, async (req, res) => {
  try {
    const { subscriptionType, months } = req.body;

    const user = await User.findById(req.user._id).populate("university");

    if (!user.university) {
      return res.status(400).json({ message: "University not found for user" });
    }

    let amount;
    let description;
    let paymentPlan;

    if (subscriptionType === "semester") {
      if (!user.university.semesterActive) {
        return res.status(400).json({
          message: "Semester subscription is not available for your university",
        });
      }
      amount = user.university.semesterPrice;
      description = "SmartDriller Semester Subscription";
      paymentPlan = "one-time";
    } else {
      const numMonths = months || 1;
      amount = user.university.monthlyPrice * numMonths;
      description = `SmartDriller Monthly Subscription (${numMonths} month${numMonths > 1 ? "s" : ""})`;
      paymentPlan = "one-time";
    }

    user.subscriptionType = subscriptionType || "monthly";
    await user.save();

    const tx_ref = `smartdriller_${Date.now()}_${req.user._id}`;
    
    // Create payment record
    const payment = new Payment({
      user: req.user._id,
      amount,
      transactionId: tx_ref,
      subscriptionType: subscriptionType || "monthly",
      status: "pending",
      meta: {
        months: months || 1,
        paymentPlan,
      },
    });
    await payment.save();

    const paymentData = {
      tx_ref,
      amount,
      currency: "NGN",
      payment_options: "card, banktransfer, ussd", // Ensure card is included
      redirect_url: `${process.env.FRONTEND_URL}/payment/callback`,
      customer: {
        email: req.user.email,
        name: req.user.fullName,
      },
      customizations: {
        title: description,
        description: `Activate your ${subscriptionType === "semester" ? "semester" : "monthly"} SmartDriller subscription`,
        logo: "https://ik.imagekit.io/ppenuno5v/smartdriller.jpg",
      },
      meta: {
        subscriptionType: subscriptionType || "monthly",
        months: months || 1,
        paymentPlan,
        userId: req.user._id.toString(),
      },
    };

    const response = await axios.post("https://api.flutterwave.com/v3/payments", paymentData, {
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    // Update payment with Flutterwave reference
    payment.flutterwaveRef = response.data.data.flw_ref;
    await payment.save();

    res.json({
      status: "success",
      message: "Payment initialized successfully",
      data: response.data.data,
    });
  } catch (error) {
    console.error("Payment initialization error:", {
      message: error.message,
      response: error.response?.data,
      config: error.config
    });
    
    res.status(500).json({
      message: "Payment initialization failed",
      error: error.response?.data?.message || error.message,
      flutterwaveError: error.response?.data
    });
  }
});

// Verify payment after redirect
router.post("/verify/:txRef", async (req, res) => {
  try {
    const { txRef } = req.params;

    const payment = await Payment.findOne({ transactionId: txRef });
    if (!payment) {
      return res.status(404).json({
        status: "failed",
        message: "Payment record not found",
      });
    }

    if (payment.status === "successful") {
      const user = await User.findById(payment.user).populate("university");
      return res.json({
        status: "success",
        message: "Payment already verified",
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          isSubscribed: user.isSubscribed,
          subscriptionExpiry: user.subscriptionExpiry,
          subscriptionStartDate: user.subscriptionStartDate,
          subscriptionType: user.subscriptionType,
          universitySubscriptionEnd: user.universitySubscriptionEnd,
          university: user.university,
        },
      });
    }

    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${txRef}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    const { data, status } = response.data;

    if (status === "success") {
      payment.status = "successful";
      payment.flutterwaveRef = data.id;
      payment.paidAt = new Date();
      await payment.save();

      const user = await User.findById(payment.user).populate("university");
      const now = new Date();

      let subscriptionExpiry;
      let universitySubscriptionEnd = null;

      if (payment.subscriptionType === "semester") {
        subscriptionExpiry = new Date(user.university.globalSubscriptionEnd);
        universitySubscriptionEnd = subscriptionExpiry;
      } else {
        const numMonths = payment.meta?.months || 1;
        subscriptionExpiry = new Date();
        subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 30 * numMonths);
      }

      if (subscriptionExpiry < now) {
        return res.status(400).json({
          status: "failed",
          message: "Subscription expiry date is in the past",
        });
      }

      const updatedUser = await User.findByIdAndUpdate(
        payment.user,
        {
          isSubscribed: true,
          subscriptionExpiry,
          subscriptionStartDate: now,
          universitySubscriptionEnd,
          subscriptionType: payment.subscriptionType,
        },
        { new: true },
      ).populate("university");

      return res.json({
        status: "success",
        message: "Payment verified and subscription activated",
        user: {
          id: updatedUser._id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          isSubscribed: updatedUser.isSubscribed,
          subscriptionExpiry: updatedUser.subscriptionExpiry,
          subscriptionStartDate: updatedUser.subscriptionStartDate,
          subscriptionType: updatedUser.subscriptionType,
          universitySubscriptionEnd: updatedUser.universitySubscriptionEnd,
          university: updatedUser.university,
        },
      });
    } else {
      payment.status = "failed";
      payment.failedAt = new Date();
      payment.failureReason = data.processor_response || "Payment verification failed";
      await payment.save();

      return res.status(400).json({
        status: "failed",
        message: "Payment verification failed",
        reason: data.processor_response || "Unknown error",
      });
    }
  } catch (error) {
    console.error("Payment verification error:", error.message);
    
    try {
      const payment = await Payment.findOne({ transactionId: req.params.txRef });
      if (payment) {
        payment.status = "failed";
        payment.failedAt = new Date();
        payment.failureReason = error.message;
        await payment.save();
      }
    } catch (saveError) {
      console.error("Error updating payment status:", saveError);
    }

    res.status(500).json({
      status: "error",
      message: "Payment verification failed",
      error: error.message,
    });
  }
});

// Webhook handler
router.post("/webhook", async (req, res) => {
  try {
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
    const signature = req.headers["verif-hash"];

    if (!signature || signature !== secretHash) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const payload = req.body;

    if (payload.event === "charge.completed" && payload.data.status === "successful") {
      const txRef = payload.data.tx_ref;
      const flutterwaveId = payload.data.id;

      const payment = await Payment.findOne({ transactionId: txRef });

      if (!payment) {
        return res.status(404).json({ message: "Payment record not found" });
      }

      if (payment.status === "successful") {
        return res.status(200).json({ status: "success", message: "Payment already processed" });
      }

      payment.status = "successful";
      payment.flutterwaveRef = flutterwaveId;
      payment.paidAt = new Date();
      await payment.save();

      const user = await User.findById(payment.user).populate("university");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const now = new Date();
      let subscriptionExpiry;
      let universitySubscriptionEnd = null;

      if (payment.subscriptionType === "semester") {
        subscriptionExpiry = new Date(user.university.globalSubscriptionEnd);
        universitySubscriptionEnd = subscriptionExpiry;
      } else {
        const numMonths = payment.meta.months || 1;
        subscriptionExpiry = new Date();
        subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 30 * numMonths);
      }

      user.isSubscribed = true;
      user.subscriptionExpiry = subscriptionExpiry;
      user.subscriptionStartDate = now;
      user.universitySubscriptionEnd = universitySubscriptionEnd;
      user.subscriptionType = payment.subscriptionType;

      await user.save();

      return res.status(200).json({
        status: "success",
        message: "Payment processed successfully",
      });
    }

    if (payload.event === "charge.completed" && payload.data.status === "failed") {
      const txRef = payload.data.tx_ref;

      const payment = await Payment.findOne({ transactionId: txRef });
      if (payment && payment.status === "pending") {
        payment.status = "failed";
        payment.failedAt = new Date();
        payment.failureReason = payload.data.processor_response || "Payment failed";
        await payment.save();
      }
    }

    res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
});

// Retry verification
router.post("/retry-verification/:paymentId", auth, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (payment.status === "successful") {
      const user = await User.findById(payment.user).populate("university");
      return res.json({
        success: true,
        message: "Payment already verified",
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          isSubscribed: user.isSubscribed,
          subscriptionExpiry: user.subscriptionExpiry,
          subscriptionStartDate: user.subscriptionStartDate,
          subscriptionType: user.subscriptionType,
          universitySubscriptionEnd: user.universitySubscriptionEnd,
          university: user.university,
        },
      });
    }

    const paymentDate = new Date(payment.createdAt);
    const now = new Date();
    const daysDiff = (now - paymentDate) / (1000 * 60 * 60 * 24);

    if (daysDiff > 30) {
      return res.status(400).json({
        success: false,
        message: "Payment is too old to be verified (over 30 days)",
      });
    }

    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${payment.transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    const { data, status } = response.data;

    if (status === "success") {
      payment.status = "successful";
      payment.paidAt = new Date();
      await payment.save();

      const user = await User.findById(payment.user).populate("university");
      const now = new Date();

      let subscriptionExpiry;
      let universitySubscriptionEnd = null;

      if (payment.subscriptionType === "semester") {
        subscriptionExpiry = new Date(user.university.globalSubscriptionEnd);
        universitySubscriptionEnd = subscriptionExpiry;
      } else {
        const numMonths = payment.meta?.months || 1;
        subscriptionExpiry = new Date();
        subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 30 * numMonths);
      }

      if (subscriptionExpiry < now) {
        return res.status(400).json({
          success: false,
          message: "Subscription expiry date is in the past",
        });
      }

      const updatedUser = await User.findByIdAndUpdate(
        payment.user,
        {
          isSubscribed: true,
          subscriptionExpiry,
          subscriptionStartDate: now,
          universitySubscriptionEnd,
          subscriptionType: payment.subscriptionType,
        },
        { new: true },
      ).populate("university");

      return res.json({
        success: true,
        message: "Payment verification successful! Your subscription has been activated.",
        user: {
          id: updatedUser._id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          isSubscribed: updatedUser.isSubscribed,
          subscriptionExpiry: updatedUser.subscriptionExpiry,
          subscriptionStartDate: updatedUser.subscriptionStartDate,
          subscriptionType: updatedUser.subscriptionType,
          universitySubscriptionEnd: updatedUser.universitySubscriptionEnd,
          university: updatedUser.university,
        },
      });
    } else {
      payment.status = "failed";
      payment.failedAt = new Date();
      payment.failureReason = data.processor_response || "Payment verification failed";
      await payment.save();

      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
        reason: data.processor_response || "Unknown error",
      });
    }
  } catch (error) {
    console.error("Retry verification error:", error.message);
    
    try {
      const payment = await Payment.findById(req.params.paymentId);
      if (payment) {
        payment.status = "failed";
        payment.failedAt = new Date();
        payment.failureReason = error.message;
        await payment.save();
      }
    } catch (saveError) {
      console.error("Error updating payment status:", saveError);
    }

    res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message,
    });
  }
});

// Payment status
router.get("/status/:txRef", auth, async (req, res) => {
  try {
    const { txRef } = req.params;

    const payment = await Payment.findOne({ transactionId: txRef });
    if (!payment) {
      return res.status(404).json({
        status: "failed",
        message: "Payment record not found",
      });
    }

    if (payment.status === "pending") {
      try {
        const response = await axios.get(
          `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${txRef}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
            },
          }
        );

        const { data, status } = response.data;

        if (status === "success") {
          payment.status = "successful";
          payment.paidAt = new Date();
          await payment.save();

          const user = await User.findById(payment.user);
          const now = new Date();

          let subscriptionExpiry;

          if (payment.subscriptionType === "semester") {
            subscriptionExpiry = new Date(user.university.globalSubscriptionEnd);
          } else {
            const numMonths = payment.meta?.months || 1;
            subscriptionExpiry = new Date();
            subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 30 * numMonths);
          }

          await User.findByIdAndUpdate(payment.user, {
            isSubscribed: true,
            subscriptionExpiry,
            subscriptionStartDate: now,
            subscriptionType: payment.subscriptionType,
          });
        } else {
          payment.status = "failed";
          payment.failedAt = new Date();
          payment.failureReason = data.processor_response || "Payment verification failed";
          await payment.save();
        }
      } catch (verifyError) {
        console.error("Payment status verification error:", verifyError);
      }
    }

    const updatedPayment = await Payment.findById(payment._id);
    const user = await User.findById(payment.user).populate("university");

    res.json({
      status: updatedPayment.status,
      payment: {
        id: updatedPayment._id,
        status: updatedPayment.status,
        subscriptionType: updatedPayment.subscriptionType,
        amount: updatedPayment.amount,
        paidAt: updatedPayment.paidAt,
        failedAt: updatedPayment.failedAt,
        failureReason: updatedPayment.failureReason,
        isRetry: updatedPayment.meta?.isRetry || false,
        originalPaymentId: updatedPayment.meta?.originalPaymentId,
      },
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        isSubscribed: user.isSubscribed,
        subscriptionExpiry: user.subscriptionExpiry,
        subscriptionStartDate: user.subscriptionStartDate,
        subscriptionType: user.subscriptionType,
        universitySubscriptionEnd: user.universitySubscriptionEnd,
        university: user.university,
      },
    });
  } catch (error) {
    console.error("Payment status check error:", error.message);
    res.status(500).json({
      message: "Failed to check payment status",
      error: error.message,
    });
  }
});

// Subscription options
router.get("/subscription-options", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("university");

    if (!user.university) {
      return res.status(400).json({ message: "University not found for user" });
    }

    const options = {
      monthly: {
        price: user.university.monthlyPrice,
        duration: "30 days per month",
        description: "Monthly subscription that you can purchase for multiple months in advance",
        months: [1, 2, 3, 4, 5, 6],
      },
    };

    if (user.university.semesterActive) {
      options.semester = {
        price: user.university.semesterPrice,
        duration: "Until semester end",
        endDate: user.university.globalSubscriptionEnd,
        description: `Valid until ${new Date(user.university.globalSubscriptionEnd).toLocaleDateString()}`,
      };
    }

    res.json({
      status: "success",
      options,
      currentSubscription: user.isSubscribed
        ? {
            type: user.subscriptionType,
            expiry: user.subscriptionExpiry,
            startDate: user.subscriptionStartDate,
          }
        : null,
    });
  } catch (error) {
    console.error("Subscription options error:", error.message);
    res.status(500).json({ message: "Failed to fetch subscription options" });
  }
});

// Payment history
router.get("/history", auth, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error("Payment history error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
    });
  }
});

module.exports = router;