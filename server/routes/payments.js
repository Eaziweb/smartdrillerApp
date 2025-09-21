const express = require("express");
const axios = require("axios");
const User = require("../models/User");
const University = require("../models/University");
const Payment = require("../models/Payment");
const { auth } = require("../middleware/auth");
const router = express.Router();

// Initialize payment
router.post("/initialize", auth, async (req, res) => {
  try {
    const { subscriptionType, isRecurring, recurringMonths } = req.body;
    
    // Get user with university details
    const user = await User.findById(req.user._id).populate("university");
    
    if (!user.university) {
      return res.status(400).json({ message: "University not found for user" });
    }
    
    // Determine amount based on subscription type
    let amount;
    let description;
    let paymentPlan;
    
    if (subscriptionType === "semester") {
      // Check if semester subscription is active for this university
      if (!user.university.semesterActive) {
        return res.status(400).json({ 
          message: "Semester subscription is not available for your university" 
        });
      }
      amount = user.university.semesterPrice;
      description = "SmartDriller Semester Subscription";
      paymentPlan = "one-time";
    } else {
      // For monthly subscription, always charge for one month at a time
      amount = user.university.monthlyPrice;
      description = "SmartDriller Monthly Subscription";
      paymentPlan = isRecurring ? "recurring" : "one-time";
    }
    
    // Update user's subscription type preference
    user.subscriptionType = subscriptionType || "monthly";
    user.recurringMonths = isRecurring ? recurringMonths : 1;
    await user.save();
    
    // Create payment data for Flutterwave
    const paymentData = {
      tx_ref: `smartdriller_${Date.now()}_${req.user._id}`,
      amount: amount,
      currency: "NGN",
      payment_options: "card, banktransfer, ussd",
      redirect_url: `${process.env.FRONTEND_URL}/payment/callback`,
      customer: {
        email: req.user.email,
        name: req.user.fullName,
      },
      customizations: {
        title: description,
        description: `Activate your ${subscriptionType === "semester" ? "semester" : "monthly"} SmartDriller subscription`,
        logo: "https://yourdomain.com/logo.png",
      },
      meta: {
        subscriptionType: subscriptionType || "monthly",
        isRecurring: isRecurring || false,
        recurringMonths: isRecurring ? recurringMonths : 1,
        paymentPlan: paymentPlan,
        userId: req.user._id.toString(),
      },
    };
    
    // For recurring payments, set up subscription plan
    if (isRecurring && subscriptionType === "monthly") {
      paymentData.subscription = {
        id: `smartdriller_sub_${Date.now()}_${req.user._id}`,
        name: "SmartDriller Monthly Subscription",
        amount: amount,
        interval: "monthly",
        duration: recurringMonths,
      };
    }
    
    // Make request to Flutterwave
    const response = await axios.post("https://api.flutterwave.com/v3/payments", paymentData, {
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });
    
    // Save payment record to database
    const payment = new Payment({
      user: req.user._id,
      amount: paymentData.amount,
      transactionId: paymentData.tx_ref,
      subscriptionType: subscriptionType || "monthly",
      status: "pending",
      meta: {
        isRecurring: isRecurring || false,
        recurringMonths: isRecurring ? recurringMonths : 1,
        paymentPlan: paymentPlan,
      }
    });
    await payment.save();
    
    // Return Flutterwave response
    res.json({
      status: "success",
      message: "Payment initialized successfully",
      data: response.data.data,
    });
  } catch (error) {
    console.error("Payment initialization error:", error);
    res.status(500).json({ 
      message: "Payment initialization failed",
      error: error.message 
    });
  }
});

// Verify payment
router.post("/verify/:txRef", async (req, res) => {
  try {
    const { txRef } = req.params;
    console.log("Verifying payment with txRef:", txRef);
    
    // Find payment by transaction reference
    const payment = await Payment.findOne({ transactionId: txRef });
    if (!payment) {
      console.error("Payment not found for txRef:", txRef);
      return res.status(404).json({ 
        status: "failed", 
        message: "Payment record not found" 
      });
    }
    
    console.log("Payment found:", payment);
    
    // If payment is already successful, return the user data
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
          subscriptionType: user.subscriptionType,
          isRecurring: user.isRecurring,
          remainingMonths: user.remainingMonths,
          nextPaymentDate: user.nextPaymentDate,
          universitySubscriptionEnd: user.universitySubscriptionEnd,
          university: user.university,
        },
      });
    }
    
    // Verify with Flutterwave
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
      
      // Get user with university details
      const user = await User.findById(payment.user).populate("university");
      
      // Calculate subscription expiry based on subscription type
      let subscriptionExpiry;
      let universitySubscriptionEnd = null;
      
      if (payment.subscriptionType === "semester") {
        // For semester subscription, use university's global end date
        subscriptionExpiry = user.university.globalSubscriptionEnd;
        universitySubscriptionEnd = subscriptionExpiry;
      } else {
        // For monthly subscription, add 30 days for the first payment
        subscriptionExpiry = new Date();
        subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 30);
        
        // If recurring, set up the recurring information
        if (payment.meta.isRecurring) {
          user.isRecurring = true;
          user.recurringMonths = payment.meta.recurringMonths;
          user.nextPaymentDate = subscriptionExpiry;
        }
      }
      
      // Update user subscription
      const updatedUser = await User.findByIdAndUpdate(
        payment.user,
        {
          isSubscribed: true,
          subscriptionExpiry,
          universitySubscriptionEnd,
          subscriptionType: payment.subscriptionType,
          isRecurring: payment.meta.isRecurring,
          recurringMonths: payment.meta.recurringMonths,
          nextPaymentDate: user.isRecurring ? subscriptionExpiry : null,
        },
        { new: true }
      ).populate('university'); // Populate university for the response
      
      console.log("User subscription updated:", updatedUser);
      
      return res.json({
        status: "success",
        message: "Payment verified and subscription activated",
        user: {
          id: updatedUser._id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          isSubscribed: updatedUser.isSubscribed,
          subscriptionExpiry: updatedUser.subscriptionExpiry,
          subscriptionType: updatedUser.subscriptionType,
          isRecurring: updatedUser.isRecurring,
          remainingMonths: updatedUser.remainingMonths,
          nextPaymentDate: updatedUser.nextPaymentDate,
          universitySubscriptionEnd: updatedUser.universitySubscriptionEnd,
          university: updatedUser.university,
        },
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

// Handle recurring payment webhook
router.post("/webhook", async (req, res) => {
  try {
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
    const signature = req.headers["verif-hash"];
    
    if (!signature || signature !== secretHash) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const payload = req.body;
    console.log("Webhook payload:", payload);
    
    // Handle subscription charge events
    if (payload.event === "charge.completed" && payload.data.meta?.paymentPlan === "recurring") {
      const userId = payload.data.meta.userId;
      const amount = payload.data.amount;
      
      // Update user subscription
      const user = await User.findById(userId);
      if (user) {
        // Extend subscription by one month
        const newExpiryDate = new Date(user.subscriptionExpiry);
        newExpiryDate.setDate(newExpiryDate.getDate() + 30);
        
        // Update next payment date
        const nextPaymentDate = new Date(user.nextPaymentDate);
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);
        
        // Update user
        user.subscriptionExpiry = newExpiryDate;
        user.nextPaymentDate = nextPaymentDate;
        user.remainingMonths = user.remainingMonths ? user.remainingMonths - 1 : user.recurringMonths - 1;
        
        // If all payments completed, mark as non-recurring
        if (user.remainingMonths <= 0) {
          user.isRecurring = false;
          user.remainingMonths = 0;
        }
        
        await user.save();
        
        // Save payment record
        const payment = new Payment({
          user: userId,
          amount: amount,
          transactionId: payload.data.tx_ref,
          flutterwaveRef: payload.data.id,
          subscriptionType: user.subscriptionType,
          status: "successful",
          meta: {
            isRecurring: true,
            recurringPayment: true,
          }
        });
        await payment.save();
        
        console.log("Recurring payment processed for user:", userId);
      }
    }
    
    res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
});

// Get subscription options for user
router.get("/subscription-options", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("university");
    
    if (!user.university) {
      return res.status(400).json({ message: "University not found for user" });
    }
    
    const options = {
      monthly: {
        price: user.university.monthlyPrice,
        duration: "30 days",
        description: "Monthly subscription that renews every 30 days",
      },
    };
    
    // Only include semester option if it's active for the university
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
      currentSubscription: user.isSubscribed ? {
        type: user.subscriptionType,
        expiry: user.subscriptionExpiry,
        isRecurring: user.isRecurring,
        remainingMonths: user.remainingMonths,
      } : null,
    });
  } catch (error) {
    console.error("Error fetching subscription options:", error);
    res.status(500).json({ message: "Failed to fetch subscription options" });
  }
});

module.exports = router;