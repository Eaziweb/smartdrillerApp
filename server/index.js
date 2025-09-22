require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const CourseofStudy = require("./models/CourseofStudy");
const { initializeData } = require("./utils/initialData");

const app = express();

// ----------------------
// Fix duplicate courses
// ----------------------
const fixDuplicates = async () => {
  try {
    const duplicates = await CourseofStudy.aggregate([
      {
        $group: {
          _id: "$name",
          count: { $sum: 1 },
          categories: { $push: "$category" }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    console.log(`Found ${duplicates.length} duplicate course names`);

    for (const duplicate of duplicates) {
      const courses = await CourseofStudy.find({ name: duplicate._id });
      console.log(`Processing duplicate: ${duplicate._id} (${courses.length} entries)`);

      const categoryMap = new Map();
      for (const course of courses) {
        const key = `${course.name}-${course.category}`;
        if (categoryMap.has(key)) {
          console.log(`  Deleting duplicate: ${course.name} in ${course.category}`);
          await CourseofStudy.deleteOne({ _id: course._id });
        } else {
          categoryMap.set(key, true);
        }
      }
    }

    console.log("✅ Duplicate cleanup completed");

    await CourseofStudy.collection.createIndex(
      { name: 1, category: 1 },
      { unique: true }
    );
    console.log("✅ Compound index created");
  } catch (error) {
    console.error("❌ Error fixing duplicates:", error);
  }
};

// ----------------------
// CORS Setup
// ----------------------
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/\.vercel\.app$/.test(origin)) return callback(null, true);
    return callback(new Error(`CORS not allowed: ${origin}`));
  },
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");

    // 🔥 Drop the bad trustedDevices index if it exists
    try {
      const indexes = await mongoose.connection.db.collection("users").indexes();
      const hasTrustedDeviceIndex = indexes.some(idx => idx.name === "trustedDevices.deviceId_1");

      if (hasTrustedDeviceIndex) {
        await mongoose.connection.db.collection("users").dropIndex("trustedDevices.deviceId_1");
        console.log("✅ Dropped trustedDevices.deviceId_1 index");
      } else {
        console.log("ℹ️ No trustedDevices index found — nothing to drop");
      }
    } catch (err) {
      console.error("❌ Failed to drop trustedDevices index:", err.message);
    }

    // Run duplicate cleanup
    await fixDuplicates();

    // Ensure SuperAdministration course exists
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

    // Ensure Administration course exists
    let adminCourse = await CourseofStudy.findOne({
      name: "Administration",
      category: "Administration"
    });
    if (!adminCourse) {
      adminCourse = new CourseofStudy({
        name: "Administration",
        category: "Administration"
      });
      await adminCourse.save();
      console.log("✅ Administration course created");
    }

    await initializeData();
  })
  .catch(err => console.error("❌ MongoDB connection error:", err));


// ----------------------
// Routes
// ----------------------
app.use("/api/auth", require("./routes/auth"));
app.use("/api/questions", require("./routes/questions"));
app.use("/api/courseYears", require("./routes/courseYears"));
app.use("/api/bookmarks", require("./routes/bookmarks"));
app.use("/api/results", require("./routes/results"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/superadmin", require("./routes/superadmin"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/videos", require("./routes/videos"));
app.use("/api/notes", require("./routes/notes"));
app.use("/api/admin/videos", require("./routes/admin-videos"));
app.use("/api/admin/notes", require("./routes/admin-notes"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/materials", require("./routes/materials"));
app.use("/api/admin/materials", require("./routes/admin-materials"));
app.use("/api/competitions", require("./routes/competitions"));
app.use("/api/admin/competitions", require("./routes/admin-competitions"));
app.use("/api/users", require("./routes/users"));
app.use("/api/courses", require("./routes/courses"));
app.use("/api/courseofstudy", require("./routes/courseofstudy"));
app.use("/api/universities", require("./routes/universities"));

// ----------------------
// Static Files
// ----------------------
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ----------------------
// Utility jobs
// ----------------------
require("./utils/updateVideoMetadata");

// ----------------------
// Error Handling
// ----------------------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!", error: err.message });
});

// ----------------------
// Root Endpoint
// ----------------------
app.get("/", (req, res) => {
  res.json({ status: "Backend running 🚀", time: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
