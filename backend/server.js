require("dotenv").config();

["JWT_SECRET", "JWT_REFRESH_SECRET"].forEach(key => {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
});

const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const helmet = require("helmet");

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
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const billingRoutes = require("./routes/billingRoutes");
const enterpriseAdminRoutes = require("./routes/enterpriseAdminRoutes");
const taskRoutes = require("./routes/taskRoutes");
const chromaRoutes = require("./routes/chromaRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

dbConnect();

const app = express();

const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:8081",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8081",
    "http://localhost:7001", // Mobile app development
    "http://127.0.0.1:7001",
  ].filter(Boolean),
);

const isLocalDevOrigin = (origin) => {
  // Never treat "it's localhost" as trustworthy in production - that check
  // only makes sense while developing against a local dev server.
  if (process.env.NODE_ENV === "production") return false;

  try {
    const parsed = new URL(origin);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "0.0.0.0"
    );
  } catch (error) {
    return false;
  }
};

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without origin (mobile apps, curl, Postman, etc.)
      if (!origin) return callback(null, true);

      // Allow whitelisted origins
      if (allowedOrigins.has(origin) || isLocalDevOrigin(origin)) {
        return callback(null, true);
      }

      // Log rejected origins for debugging
      console.warn(`[CORS] Blocked origin: ${origin}`);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/enterprise-admin", enterpriseAdminRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/chroma", chromaRoutes);
app.use("/api/notifications", notificationRoutes);

// 404 handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// Global error handler - catches anything that reaches next(err), including
// CORS rejections, multer fileFilter errors, and unhandled sync throws in
// route handlers. Without this, Express falls back to its default HTML
// error page (and leaks stack traces outside development).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const isCorsError = typeof err?.message === "string" && err.message.startsWith("CORS blocked origin");
  if (isCorsError) {
    return res.status(403).json({ message: "Not allowed by CORS" });
  }

  console.error("Unhandled error:", err);

  if (process.env.NODE_ENV === "production") {
    return res.status(err.status || 500).json({ message: "Server error" });
  }

  return res.status(err.status || 500).json({ message: err.message || "Server error" });
});

// Start the server
const PORT = process.env.PORT || 7001;
app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});
