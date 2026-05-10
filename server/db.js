const mongoose = require("mongoose");

const connectDB = async () => {
  // readyState: 1 = connected, 2 = connecting
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      bufferCommands: false, // ← CRITICAL: don't queue ops if not connected
    });

    console.log("✅ MongoDB connected");
    return mongoose.connection;

  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};

module.exports = connectDB;