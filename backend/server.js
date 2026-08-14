require("dotenv").config();

// Always-required secrets, in every environment.
["JWT_SECRET", "JWT_REFRESH_SECRET"].forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
});

const isProduction = process.env.NODE_ENV === "production";

// Vars that are only structurally required once this is actually deployed.
// Checked eagerly (instead of failing silently later) so a mis-configured
// production deploy refuses to boot rather than serve broken requests.
if (isProduction) {
  [
    "CONNECTION_STRING",
    "FRONTEND_URL",
    "BACKEND_URL",
    "ENCRYPTION_KEY",
    "OPENAI_API_KEY",
    "EMAIL_USER",
    "EMAIL_PASS",
    "PAYHERE_MERCHANT_ID",
    "PAYHERE_MERCHANT_SECRET",
    "PAYHERE_APP_ID",
    "PAYHERE_APP_SECRET",
  ].forEach((key) => {
    if (!process.env[key]) {
      throw new Error(`Missing required production env var: ${key}`);
    }
  });
}

const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

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

const app = express();

// Required behind any reverse proxy / load balancer (Render, Heroku, Nginx,
// etc.) so req.protocol and req.secure reflect the original client request
// instead of the internal proxy hop. Without this, secure cookies and
// PayHere return URLs would be built with "http://" in production.
app.set("trust proxy", 1);

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
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // The PayHere checkout launch page and payment return/cancel pages
        // use small inline scripts to auto-submit a form / redirect back
        // into the app; everything else served here is a JSON API.
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'", "https://sandbox.payhere.lk", "https://www.payhere.lk"],
      },
    },
  }),
);
app.use(compression());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header (mobile apps, curl, server-
      // to-server callers like the PayHere notify webhook). CORS is a
      // browser-enforced mechanism, so this doesn't weaken same-origin
      // protections for browser clients.
      if (!origin) return callback(null, true);

      // Allow whitelisted origins
      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      // Only trust "any localhost origin" outside of production - in
      // production this would otherwise let anyone spin up a page on their
      // own machine that calls the API with credentials.
      if (!isProduction && isLocalDevOrigin(origin)) {
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

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(passport.initialize());

// Rate limiting - a generous baseline across the whole API, plus tighter
// limits on the endpoints most attractive to brute-force/abuse (login/OTP
// flows and the OpenAI-backed chat endpoint).
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});

app.use("/api/", standardLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/chat", chatLimiter);

// Health check for load balancers / uptime monitors.
app.get("/health", (req, res) => {
  const mongoose = require("mongoose");
  const dbState = mongoose.connection.readyState; // 1 = connected
  res.status(dbState === 1 ? 200 : 503).json({
    status: dbState === 1 ? "ok" : "degraded",
    db: ["disconnected", "connected", "connecting", "disconnecting"][dbState] || "unknown",
  });
});

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

// 404 handler - must come after all routes.
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// Central error handler - must be defined last, with 4 args, for Express to
// recognize it as an error-handling middleware.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    message: isProduction ? "Internal server error" : err.message || "Internal server error",
  });
});

// Only bind a port / install process-level signal handlers when this file is
// run directly (`node server.js`, which is what `npm start`/`npm run dev`
// do). When it's `require()`d instead - e.g. by a supertest-based test - we
// export the configured `app` without starting a real listener, so tests
// don't bind sockets, leak servers between test files, or race a real
// MongoDB connection.
/* istanbul ignore next -- exercised via `npm start`, not the test suite */
if (require.main === module) {
  dbConnect();

  const PORT = process.env.PORT || 7001;
  const server = app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
  });

  // Don't let one bad promise or stray exception silently kill request
  // handling without a trace - log it so it surfaces in deployment logs.
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
  });

  // Graceful shutdown so in-flight requests finish and the process manager
  // (Docker, systemd, PM2, etc.) sees a clean exit instead of a hard kill.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down gracefully...`);
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
    // Force-exit if close() hangs (e.g. a socket never finished).
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

module.exports = app;
