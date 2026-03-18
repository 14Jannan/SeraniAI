const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    instructorName: { type: String, required: true, trim: true },

    description: { type: String, required: true, trim: true },

    category: { type: String, required: true, trim: true }, // Mindfulness, Stress, Sleep...
    level: { type: String, enum: ["Beginner", "Intermediate", "Advanced"], default: "Beginner" },

    thumbnailUrl: { type: String, default: "" },

    isPublished: { type: Boolean, default: true },

    // soft delete (recommended for admin delete)
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);
