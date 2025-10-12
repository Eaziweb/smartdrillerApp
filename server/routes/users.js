const express = require("express")
const User = require("../models/User")
const { auth } = require("../middleware/auth")
const { checkAndUpdateSubscription } = require("../utils/userUtils")

const router = express.Router()

router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("university").populate("course")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    await checkAndUpdateSubscription(user)

    res.json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        course: user.course,
        phoneNumber: user.phoneNumber,
        accountNumber: user.accountNumber,
        bankName: user.bankName,
        university: user.university,
        isSubscribed: user.isSubscribed,
        subscriptionExpiry: user.subscriptionExpiry,
        subscriptionType: user.subscriptionType,
        lastNotificationView: user.lastNotificationView,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

router.put("/profile", auth, async (req, res) => {
  try {
    const { fullName, phoneNumber, accountNumber, bankName } = req.body
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (fullName) user.fullName = fullName
    if (phoneNumber) user.phoneNumber = phoneNumber
    if (accountNumber) user.accountNumber = accountNumber
    if (bankName) user.bankName = bankName

    await checkAndUpdateSubscription(user)

    await user.save()

    const populatedUser = await User.findById(user._id).populate("university").populate("course")

    res.json({
      message: "Profile updated successfully",
      user: {
        id: populatedUser._id,
        fullName: populatedUser.fullName,
        email: populatedUser.email,
        course: populatedUser.course,
        phoneNumber: populatedUser.phoneNumber,
        accountNumber: populatedUser.accountNumber,
        bankName: populatedUser.bankName,
        university: populatedUser.university,
        isSubscribed: populatedUser.isSubscribed,
        subscriptionExpiry: populatedUser.subscriptionExpiry,
        subscriptionType: populatedUser.subscriptionType,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

router.put("/last-notification-view", auth, async (req, res) => {
  try {
    const now = new Date()
    const user = await User.findByIdAndUpdate(req.user._id, { lastNotificationView: now }, { new: true })
      .populate("university")
      .populate("course")

    await checkAndUpdateSubscription(user)

    res.json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        course: user.course,
        phoneNumber: user.phoneNumber,
        accountNumber: user.accountNumber,
        bankName: user.bankName,
        university: user.university,
        isSubscribed: user.isSubscribed,
        subscriptionExpiry: user.subscriptionExpiry,
        subscriptionType: user.subscriptionType,
        lastNotificationView: user.lastNotificationView,
      },
    })
  } catch (error) {
    console.error("Failed to update last notification view:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
