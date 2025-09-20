require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const CourseofStudy = require("./models/CourseofStudy");

const app = express();

// ----------------------
// CORS Setup
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000" 
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS not allowed"));
  },
  credentials: true, 
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ----------------------
// MongoDB Connection
// ----------------------
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    // Create superadmin after successful connection
    createOrUpdateSuperAdmin();
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

// ----------------------
// Superadmin Creation Function
// ----------------------
const createOrUpdateSuperAdmin = async () => {
  try {
    const { SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = process.env;

    if (!SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
      console.log("⚠️ Superadmin credentials not set in environment variables");
      return;
    }

    // Check if superadmin already exists
    let superadmin = await User.findOne({ role: "superadmin" });

    if (superadmin) {
      // Update existing superadmin password if needed
      const isMatch = await bcrypt.compare(SUPERADMIN_PASSWORD, superadmin.password);
      if (!isMatch) {
        const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
        superadmin.password = hashedPassword;
        await superadmin.save();
        console.log("✅ Superadmin password updated");
      } else {
        console.log("✅ Superadmin already exists with correct password");
      }
      return;
    }

    // Create a special course for superadmin if it doesn't exist
    let superadminCourse = await CourseofStudy.findOne({ name: "Super Administration" });
    if (!superadminCourse) {
      superadminCourse = new CourseofStudy({
        name: "Super Administration",
        category: "Administration"
      });
      await superadminCourse.save();
      console.log("✅ Superadmin course created");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);

    // Create superadmin with all required fields
    const superadminData = {
      fullName: "SuperAdmin",
      email: SUPERADMIN_EMAIL,
      password: hashedPassword,
      course: superadminCourse._id,
      university: null, // Superadmin doesn't need a university
      phoneNumber: "",
      accountNumber: "",
      bankName: "",
      isSubscribed: false,
      subscriptionExpiry: null,
      universitySubscriptionEnd: null,
      isEmailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpires: null,
      role: "superadmin",
      subscriptionType: "monthly",
      isRecurring: false,
      recurringMonths: 1,
      remainingMonths: 0,
      nextPaymentDate: null,
      deviceOTP: null,
      deviceOTPExpires: null,
      maxDevices: 4,
      trustedDevices: []
    };

    superadmin = new User(superadminData);
    await superadmin.save();
    console.log("✅ Superadmin created successfully:", superadmin.email);

  } catch (error) {
    console.error("❌ Error creating/updating superadmin:", error);
  }
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});