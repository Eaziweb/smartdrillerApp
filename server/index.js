require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL, 
  "http://localhost:3000"   
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin like Postman or server-to-server
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ----------------------
// MongoDB Connection
// ----------------------
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
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

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

require("./utils/updateVideoMetadata");

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!", error: err.message });
});


app.get("/", (req, res) => {
  res.json({ status: "Backend running 🚀", time: new Date() });
});

=
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
