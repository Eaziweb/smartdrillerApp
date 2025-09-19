const express = require("express")
const User = require("../models/User")
const { auth } = require("../middleware/auth")

const router = express.Router()

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
    await user.save()
    
    // Populate university and course details before returning
    const populatedUser = await User.findById(user._id)
      .populate('university')
      .populate('course')
    
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
        isRecurring: populatedUser.isRecurring,
        remainingMonths: populatedUser.remainingMonths,
        nextPaymentDate: populatedUser.nextPaymentDate,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
});

// Update last notification view time
router.put("/last-notification-view", auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { lastNotificationView: new Date() },
      { new: true }
    );

    res.json({ success: true, user });
  } catch (error) {
    console.error("Failed to update last notification view:", error);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router