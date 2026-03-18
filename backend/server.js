const express = require("express");
const path = require('path');
const cors = require("cors");
require("dotenv").config();

const dbConnect = require("./config/dbConnect");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes"); 
const adminCourseRoutes = require("./routes/adminCourseRoutes");
const courseRoutes = require("./routes/courseRoutes");
const lessonRoutes = require("./routes/lessonRoutes");
const streakRoutes = require("./routes/streakRoutes");

dbConnect();  // ✅ ONLY connection

const app = express();

app.use(cors());
app.use(express.json());
// server.js
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminCourseRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/streak", streakRoutes);


const PORT = process.env.PORT || 7001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
