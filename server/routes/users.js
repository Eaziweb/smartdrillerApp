const express = require("express")
const User = require("../models/User")
const { auth } = require("../middleware/auth")

const router = express.Router()

// Update user profile
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

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        course: user.course,
        phoneNumber: user.phoneNumber,
        accountNumber: user.accountNumber,
        bankName: user.bankName,
        isSubscribed: user.isSubscribed,
        subscriptionExpiry: user.subscriptionExpiry,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router