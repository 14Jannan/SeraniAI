const mongoose = require("mongoose");

const TASK_CATEGORIES = [
  "Mindfulness",
  "Stress Relief",
  "Emotional Awareness",
  "Self-Care",
  "Focus",
];

const TASK_TYPES = ["breathing", "timer", "input", "guided", "action"];

const TASK_DIFFICULTIES = ["easy", "medium", "hard"];

const taskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: TASK_CATEGORIES,
    },
    duration: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: TASK_TYPES,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    difficulty: {
      type: String,
      enum: TASK_DIFFICULTIES,
      default: "easy",
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret.taskId;
        return ret;
      },
    },
  }
);

const Task = mongoose.model("Task", taskSchema);

module.exports = {
  Task,
  TASK_CATEGORIES,
  TASK_TYPES,
  TASK_DIFFICULTIES,
};
