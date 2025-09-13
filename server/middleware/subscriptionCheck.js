const jwt = require("jsonwebtoken")
const User = require("../models/User")

const subscriptionCheck = async (req, res, next) => {
  try {
    // First check if user is authenticated
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId)

    if (!user) {
      return res.status(401).json({ message: "Invalid token." })
    }

    // Check subscription status
    if (!user.isSubscribed) {
      return res.status(403).json({
        message: "Premium subscription required to access this feature.",
        subscriptionRequired: true,
      })
    }

    // Check if subscription is expired
    if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) < new Date()) {
      // Update user subscription status
      await User.findByIdAndUpdate(user._id, {
        isSubscribed: false,
        subscriptionStatus: "expired",
      })

      return res.status(403).json({
        message: "Your subscription has expired. Please renew to continue.",
        subscriptionExpired: true,
      })
    }

    req.user = user
    next()
  } catch (error) {
    console.error("Subscription check error:", error)
    res.status(500).json({ message: "Server error during subscription verification." })
  }
}

module.exports = subscriptionCheck
