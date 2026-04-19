const mongoose = require("mongoose");

const journalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    mood: {
      type: String,
      default: "",
      trim: true,
    },
    moodConfidence: {
      type: Number,
      default: null,
      min: 0,
      max: 1,
    },
    moodSource: {
      type: String,
      enum: ["manual", "ai", "fallback"],
      default: "manual",
    },
    tags: {
      type: [String],
      default: [],
    },
    aiInsight: {
      summary: {
        type: String,
        default: "",
      },
      emotionalTone: {
        type: String,
        default: "",
      },
      keyThemes: {
        type: [String],
        default: [],
      },
      suggestedAction: {
        type: String,
        default: "",
      },
      generatedAt: {
        type: Date,
      },
      provider: {
        type: String,
        default: "",
      },
      model: {
        type: String,
        default: "",
      },
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

journalSchema.index({ user: 1, createdAt: -1 });
journalSchema.index({ user: 1, mood: 1, createdAt: -1 });
journalSchema.index({ user: 1, tags: 1, createdAt: -1 });
journalSchema.index({ user: 1, isFavorite: 1, createdAt: -1 });

module.exports = mongoose.model("Journal", journalSchema);