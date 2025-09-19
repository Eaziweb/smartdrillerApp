require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const path = require("path")

const cookieParser = require('cookie-parser');
const app = express()

// Middleware
app.use(cors())
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser());

// Serve static files from React build
app.use(express.static(path.join(__dirname, "build")))

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));


// Routes
app.use("/api/auth", require("./routes/auth"))
app.use("/api/questions", require("./routes/questions"))
app.use("/api/courseYears", require("./routes/courseYears"))
app.use("/api/bookmarks", require("./routes/bookmarks"))
app.use("/api/results", require("./routes/results"))
app.use("/api/reports", require("./routes/reports"))
app.use("/api/admin", require("./routes/admin"))
app.use("/api/superadmin", require("./routes/superadmin"))
app.use("/api/payments", require("./routes/payments"))
app.use("/api/notifications", require("./routes/notifications"))
app.use("/api/videos", require("./routes/videos"))
app.use("/api/notes", require("./routes/notes"))
app.use("/api/admin/videos", require("./routes/admin-videos"))
app.use("/api/admin/notes", require("./routes/admin-notes"))
app.use("/api/ai", require("./routes/ai"))
app.use("/api/materials", require("./routes/materials"))
app.use("/api/admin/materials", require("./routes/admin-materials"))
app.use("/api/competitions", require("./routes/competitions"))
app.use("/api/admin/competitions", require("./routes/admin-competitions"))
app.use("/api/users", require("./routes/users"))
app.use("/api/courses", require("./routes/courses"))
app.use("/api/courseofstudy", require("./routes/courseofstudy"))

// server.js or app.js
// server.js or app.js
const universityRoutes = require("./routes/universities");
app.use("/api/universities", universityRoutes);
require('./utils/updateVideoMetadata');



// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"))
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: "Something went wrong!" })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
console.log("Connecting to MongoDB:", process.env.MONGODB_URI);

