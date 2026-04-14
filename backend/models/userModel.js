const mongoose = require("mongoose");

const lessonProgressSchema = new mongoose.Schema(
  {
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
    journal: {
      type: String,
      default: "",
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: function requiredPassword() {
      return !this.authProvider || this.authProvider === "local";
    },
  },
  authProvider: {
    type: String,
    enum: ["local", "google", "github", "facebook"],
    default: "local",
  },
  googleId: { type: String, unique: true, sparse: true },
  githubId: { type: String, unique: true, sparse: true },
  facebookId: { type: String, unique: true, sparse: true },
  oauthTokens: {
    google: {
      accessToken: { type: String },
      refreshToken: { type: String },
      tokenType: { type: String },
      scope: { type: String },
      expiresAt: { type: Date },
      refreshTokenExpiresAt: { type: Date },
      updatedAt: { type: Date },
    },
    github: {
      accessToken: { type: String },
      refreshToken: { type: String },
      tokenType: { type: String },
      scope: { type: String },
      expiresAt: { type: Date },
      refreshTokenExpiresAt: { type: Date },
      updatedAt: { type: Date },
    },
    facebook: {
      accessToken: { type: String },
      refreshToken: { type: String },
      tokenType: { type: String },
      scope: { type: String },
      expiresAt: { type: Date },
      refreshTokenExpiresAt: { type: Date },
      updatedAt: { type: Date },
    },
  },
  role: {
    type: String,
    enum: ["user", "admin", "enterprise"],
    default: "user",
  },
  // OTP Fields
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date },

  createdAt: { type: Date, default: Date.now },
  
  streakCount: {
  type: Number,
  default: 0,
},
lastLessonCompletedAt: {
  type: Date,
  default: null,
},
  taskStreakCount: {
    type: Number,
    default: 0,
  },
  lastTaskCompletedAt: {
    type: Date,
    default: null,
  },
lessonProgress: {
  type: [lessonProgressSchema],
  default: [],
},

  streakCount: {
    type: Number,
    default: 0,
  },
  lastLessonCompletedAt: {
    type: Date,
    default: null,
  },
  lessonProgress: {
    type: [lessonProgressSchema],
    default: [],
  },
});

module.exports = mongoose.model("User", userSchema);
