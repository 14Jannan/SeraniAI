const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    enrolledAt: { type: Date, default: Date.now },

    status: {
      type: String,
      enum: ["active", "completed", "paused"],
      default: "active",
    },
  },
  { timestamps: true }
);

// ✅ IMPORTANT: prevent same user enrolling same course twice
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model("Enrollment", enrollmentSchema);
