require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const cron = require("node-cron");
const connectDB = require("./db"); 
const { checkUniversitySubscriptions } = require("./jobs/universitySubscriptionChecker");

const app = express();

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

// ----------------------
// Database Middleware (CRITICAL FOR VERCEL)
// ----------------------
// This ensures the DB is connected before any route is hit, preventing timeouts.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    return res.status(500).json({ message: "Database connection failed", error: error.message });
  }
});

// ----------------------
// Cron Jobs
// ----------------------
cron.schedule("0 0 * * *", async () => {
  // Ensure DB is connected before cron runs
  await connectDB();
  await checkUniversitySubscriptions();
});

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
app.use("/api/test", require("./routes/test"));
app.use("/api/payments/webhook", require("./middleware/webhookLogger"));

// ----------------------
// Static Files & Utilities
// ----------------------
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
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
// Export & Listen
// ----------------------
// Exporting the app is required for Vercel serverless functions
module.exports = app;

// Keep listen for local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Local server running on port ${PORT}`);
  });
}