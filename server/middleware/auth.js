const jwt = require("jsonwebtoken")
const User = require("../models/User")

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select("-password")

    if (!user) {
      return res.status(401).json({ message: "Token is not valid" })
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" })
  }
}

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")
    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" })
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select("-password")
    if (!user) {
      return res.status(401).json({ message: "Token is not valid" })
    }
    // Allow both admin and superadmin
    if (user.role !== "admin" && user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied. Admin only." })
    }
    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ message: "Authorization failed" })
  }
}

const superAdminAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")
    if (!token) {
      console.log("No token provided");
      return res.status(401).json({ message: "No token, authorization denied" })
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log("Decoded token:", decoded);
    
    const user = await User.findById(decoded.userId).select("-password")
    if (!user) {
      console.log("User not found");
      return res.status(401).json({ message: "Token is not valid" })
    }
    
    console.log("User role:", user.role);
    if (user.role !== "superadmin") {
      console.log("Access denied. User role is not superadmin");
      return res.status(403).json({ message: "Access denied. SuperAdmin only." })
    }
    
    req.user = user
    next()
  } catch (error) {
    console.error("SuperAdmin auth error:", error);
    res.status(401).json({ message: "Authorization failed" })
  }
}

module.exports = { auth, adminAuth, superAdminAuth }
