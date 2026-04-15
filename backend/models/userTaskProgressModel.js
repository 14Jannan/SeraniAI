const mongoose = require("mongoose");

const userTaskProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    taskIds: {
      type: [String],
      default: [],
    },
    completedTaskIds: {
      type: [String],
      default: [],
    },
    taskResults: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    xp: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

userTaskProgressSchema.index({ user: 1, dateKey: 1 }, { unique: true });

const UserTaskProgress = mongoose.model("UserTaskProgress", userTaskProgressSchema);

module.exports = UserTaskProgress;
