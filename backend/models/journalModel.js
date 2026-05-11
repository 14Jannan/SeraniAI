const mongoose = require("mongoose");

// Define the persisted structure for user journal entries and derived analysis fields.
const journalSchema = new mongoose.Schema(
  {
    user: {
      // Reference to the User who owns this journal entry; required for user-scoped queries.
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      // Optional entry title for quick identification and organization.
      type: String,
      trim: true,
      default: "",
    },
    content: {
      // Main journal text body; required field for meaningful entry storage.
      type: String,
      required: true,
      trim: true,
    },
    mood: {
      // Detected or manual mood label; normalized to MOOD_WHITELIST values.
      type: String,
      default: "",
      trim: true,
    },
    moodConfidence: {
      // AI confidence score (0-1) for mood classification; manual entries receive 1.0.
      type: Number,
      default: null,
      min: 0,
      max: 1,
    },
    moodSource: {
      // Origin of mood value: manual entry, AI prediction, or fallback heuristic.
      type: String,
      enum: ["manual", "ai", "fallback"],
      default: "manual",
    },
    tags: {
      // User-defined tags for categorization and filtering (max 12 per entry).
      type: [String],
      default: [],
    },
    aiInsight: {
      // Nested AI-generated analysis results: summary, tone, themes, and suggestions.
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
      // Flag to mark entries as important or frequently referenced.
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Create compound indexes for common user-scoped query and filter patterns.
journalSchema.index({ user: 1, createdAt: -1 });
journalSchema.index({ user: 1, mood: 1, createdAt: -1 });
journalSchema.index({ user: 1, tags: 1, createdAt: -1 });
journalSchema.index({ user: 1, isFavorite: 1, createdAt: -1 });

// Export the Journal model for use in controllers and services.
module.exports = mongoose.model("Journal", journalSchema);