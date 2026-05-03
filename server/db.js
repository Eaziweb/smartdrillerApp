const mongoose = require("mongoose");
const User = require("./models/User");
const CourseofStudy = require("./models/CourseofStudy");

// This variable survives between requests on a "warm" serverless function
let isConnected = false;


const initializeSuperAdmin = async () => {
  try {
    let superAdminCourse = await CourseofStudy.findOne({
      name: "SuperAdministration",
      category: "Administration"
    });
    if (!superAdminCourse) {
      superAdminCourse = new CourseofStudy({
        name: "SuperAdministration",
        category: "Administration"
      });
      await superAdminCourse.save();
      console.log("✅ SuperAdministration course created");
    }
  } catch (error) {
    console.error("❌ Error creating SuperAdmin course:", error);
  }
};

const connectDB = async () => {
  // If we already have a connection, use it
  if (isConnected) {
    return;
  }

  try {
    // Fail early (5s) instead of timing out at 10s
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = db.connections[0].readyState === 1;
    console.log("✅ MongoDB connected (Cold Start)");


    // await initializeSuperAdmin();

  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};

module.exports = connectDB;