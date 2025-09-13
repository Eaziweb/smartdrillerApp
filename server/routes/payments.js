const express = require("express")
const axios = require("axios")
const User = require("../models/User")
const Payment = require("../models/Payment")
const Settings = require("../models/Settings")
const { auth } = require("../middleware/auth")
const router = express.Router()

// Initialize payment
router.post("/initialize", auth, async (req, res) => {
  try {
    const { amount } = req.body
    const settings = await Settings.findOne()
    const subscriptionPrice = settings?.subscriptionPrice || 3000
    const paymentData = {
      tx_ref: `smartdriller_${Date.now()}_${req.user._id}`,
      amount: amount || subscriptionPrice,
      currency: "NGN",
      redirect_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/payment/callback`,
      customer: {
        email: req.user.email,
        name: req.user.fullName,
      },
      customizations: {
        title: "SmartDrill Subscription",
        description: "Activate your SmartDrill subscription",
      },
    }
    const response = await axios.post("https://api.flutterwave.com/v3/payments", paymentData, {
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    })
    // Save payment record
    const payment = new Payment({
      user: req.user._id,
      amount: paymentData.amount,
      transactionId: paymentData.tx_ref,
      status: "pending",
    })
    await payment.save()
    res.json({
      status: "success",
      data: response.data.data,
    })
  } catch (error) {
    console.error("Payment initialization error:", error)
    res.status(500).json({ message: "Payment initialization failed" })
  }
})

// Verify payment
router.post("/verify/:txRef", async (req, res) => {
  try {
    const { txRef } = req.params;
    console.log("Verifying payment with txRef:", txRef);
    
    // Find payment by transaction reference (not transaction ID)
    const payment = await Payment.findOne({ transactionId: txRef });
    if (!payment) {
      console.error("Payment not found for txRef:", txRef);
      return res.status(404).json({ 
        status: "failed", 
        message: "Payment record not found" 
      });
    }
    
    console.log("Payment found:", payment);
    
    // Verify with Flutterwave using the correct endpoint for tx_ref
    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${txRef}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );
    
    const { data, status } = response.data;
    console.log("Flutterwave response:", { status, data });
    
    if (status === "success") {
      // Update payment record
      payment.status = "successful";
      payment.flutterwaveRef = data.id;
      await payment.save();
      console.log("Payment updated to successful:", payment);
      
      // Get subscription duration from settings
      const settings = await Settings.findOne();
      const subscriptionDuration = settings?.subscriptionDuration || 30; // days
      const subscriptionExpiry = new Date();
      subscriptionExpiry.setDate(subscriptionExpiry.getDate() + subscriptionDuration);
      
      // Update user subscription
      const updatedUser = await User.findByIdAndUpdate(
        payment.user,
        {
          isSubscribed: true,
          subscriptionExpiry,
        },
        { new: true }
      );
      
      console.log("User subscription updated:", updatedUser);
      
      return res.json({
        status: "success",
        message: "Payment verified and subscription activated",
        user: updatedUser,
      });
    } else {
      // Mark payment as failed if verification fails
      payment.status = "failed";
      await payment.save();
      console.log("Payment marked as failed");
      
      return res.status(400).json({
        status: "failed",
        message: "Payment verification failed",
      });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    
    // Try to mark payment as failed on error
    try {
      const payment = await Payment.findOne({ transactionId: req.params.txRef });
      if (payment) {
        payment.status = "failed";
        await payment.save();
      }
    } catch (saveError) {
      console.error("Failed to mark payment as failed:", saveError);
    }
    
    res.status(500).json({ 
      status: "error", 
      message: "Payment verification failed",
      error: error.message 
    });
  }
});


module.exports = router