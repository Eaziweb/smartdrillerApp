const express = require("express")
const User = require("../models/User")
const Notification = require("../models/Notification")
const Payment = require("../models/Payment")
const Settings = require("../models/Settings")
const { adminAuth } = require("../middleware/auth")

const router = express.Router()

// Get dashboard stats
// Get dashboard stats - Only counting verified users
router.get("/dashboard", adminAuth, async (req, res) => {
  try {
    // Only count verified users (isEmailVerified: true)
    const totalUsers = await User.countDocuments({ 
      role: "user", 
      isEmailVerified: true 
    })
    
    const subscribedUsers = await User.countDocuments({
      role: "user",
      isSubscribed: true,
      isEmailVerified: true, // Only count verified users
    })
    
    const subscriptionPercentage = totalUsers > 0 ? (subscribedUsers / totalUsers) * 100 : 0

    // Only count payments from verified users
    const verifiedUserIds = await User.find({
      role: "user",
      isEmailVerified: true
    }).select('_id');
    
    const payments = await Payment.find({ 
      status: "successful",
      user: { $in: verifiedUserIds.map(u => u._id) }
    })
    
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0)

    res.json({
      totalUsers,
      subscribedUsers,
      subscriptionPercentage: Math.round(subscriptionPercentage),
      totalRevenue,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get all users - Only showing verified users
router.get("/users", adminAuth, async (req, res) => {
  try {
    const users = await User.find({ 
      role: "user",
      isEmailVerified: true // Only show verified users
    })
      .select("-password")
      .populate('university')
      .populate('course')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create notification
router.post("/notifications", adminAuth, async (req, res) => {
  try {
    const { title, message, type } = req.body

    const notification = new Notification({
      title,
      message,
      type,
      createdBy: req.user._id,
    })

    await notification.save()

    res.status(201).json({
      message: "Notification created successfully",
      notification,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get all notifications
router.get("/notifications", adminAuth, async (req, res) => {
  try {
    const notifications = await Notification.find().populate("createdBy", "fullName").sort({ createdAt: -1 })

    res.json(notifications)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete notification
router.delete("/notifications/:id", adminAuth, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id)
    res.json({ message: "Notification deleted successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update subscription end date
router.put("/subscription-settings", adminAuth, async (req, res) => {
  try {
    const { subscriptionEndDate } = req.body

    let settings = await Settings.findOne()
    if (!settings) {
      settings = new Settings()
    }

    settings.subscriptionEndDate = new Date(subscriptionEndDate)
    await settings.save()

    // Update all user subscriptions to expire on this date
    await User.updateMany({ role: "user", isSubscribed: true }, { subscriptionExpiry: settings.subscriptionEndDate })

    res.json({
      message: "Subscription settings updated successfully",
      settings,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get subscription settings
router.get("/subscription-settings", adminAuth, async (req, res) => {
  try {
    let settings = await Settings.findOne()
    if (!settings) {
      settings = new Settings()
      await settings.save()
    }

    res.json(settings)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

router.put("/users/:id/subscription", adminAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { isSubscribed, subscriptionExpiry } = req.body

    const user = await User.findByIdAndUpdate(
      id,
      {
        isSubscribed,
        subscriptionExpiry: subscriptionExpiry ? new Date(subscriptionExpiry) : null,
        subscriptionStatus: isSubscribed ? "active" : "inactive",
      },
      { new: true },
    ).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({
      message: "User subscription updated successfully",
      user,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})



module.exports = router
