const express = require("express");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv").config();
const cookieParser = require("cookie-parser");
const passport = require("passport");
require("dotenv").config();

const dbConnect = require("./config/dbConnect");
require("./config/passport"); // Load passport configuration

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const journalRoutes = require("./routes/journalRoutes");
const courseRoutes = require("./routes/courseRoutes");
const lessonRoutes = require("./routes/lessonRoutes");
const streakRoutes = require("./routes/streakRoutes");
const chatRoutes = require("./routes/chatRoutes");

dbConnect();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Serve static files from uploads directory
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/journals", journalRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/streak", streakRoutes);
app.use("/api/chat", chatRoutes);

// Start the server
const PORT = process.env.PORT || 7001;
app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});
