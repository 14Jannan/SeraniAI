const { Task } = require("../models/taskModel");
const UserTaskProgress = require("../models/userTaskProgressModel");
const User = require("../models/userModel");
const DEFAULT_TASK_LIBRARY = require("../utils/defaultTasks");

function dateKeyFromDate(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeTaskPayload(body = {}) {
  return {
    taskId: body.id || body.taskId,
    title: body.title,
    category: body.category,
    duration: body.duration,
    type: body.type,
    isActive: body.isActive,
    difficulty: body.difficulty,
    config: body.config || {},
  };
}

async function ensureDefaultTasks() {
  const count = await Task.countDocuments();
  if (count > 0) {
    return;
  }

  await Task.insertMany(DEFAULT_TASK_LIBRARY, { ordered: false });
}

function pickDailyCount() {
  return Math.floor(Math.random() * 3) + 3;
}

function isYesterday(lastDate, currentDate) {
  const yesterday = new Date(currentDate);
  yesterday.setDate(currentDate.getDate() - 1);

  return (
    lastDate.getFullYear() === yesterday.getFullYear() &&
    lastDate.getMonth() === yesterday.getMonth() &&
    lastDate.getDate() === yesterday.getDate()
  );
}

function isSameDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

exports.getTasks = async (req, res) => {
  try {
    await ensureDefaultTasks();

    const { category, q, activeOnly } = req.query;
    const filter = {};

    if (activeOnly === "true") {
      filter.isActive = true;
    }

    if (category) {
      filter.category = category;
    }

    if (q) {
      filter.title = { $regex: q, $options: "i" };
    }

    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    return res.status(200).json(tasks);
  } catch (error) {
    return res.status(500).json({ message: "Failed to get tasks", error: error.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    const payload = normalizeTaskPayload(req.body);
    if (!payload.taskId || !payload.title || !payload.category || !payload.duration || !payload.type) {
      return res.status(400).json({ message: "taskId, title, category, duration and type are required" });
    }

    const existing = await Task.findOne({ taskId: payload.taskId });
    if (existing) {
      return res.status(409).json({ message: "Task id already exists" });
    }

    const created = await Task.create(payload);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create task", error: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const updates = normalizeTaskPayload(req.body);
    const task = await Task.findOne({ taskId: req.params.id });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (updates.taskId && updates.taskId !== task.taskId) {
      const conflict = await Task.findOne({ taskId: updates.taskId });
      if (conflict) {
        return res.status(409).json({ message: "Task id already exists" });
      }
    }

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        task[key] = value;
      }
    });

    const updated = await task.save();
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update task", error: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const removed = await Task.findOneAndDelete({ taskId: req.params.id });
    if (!removed) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.status(200).json({ message: "Task deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete task", error: error.message });
  }
};

exports.getDailyTasks = async (req, res) => {
  try {
    await ensureDefaultTasks();

    const dateKey = req.query.dateKey || dateKeyFromDate(new Date());
    const userId = req.user.id;

    const existingProgress = await UserTaskProgress.findOne({ user: userId, dateKey });
    if (existingProgress && existingProgress.taskIds.length > 0) {
      const existingTasks = await Task.find({ taskId: { $in: existingProgress.taskIds }, isActive: true });
      if (existingTasks.length > 0) {
        return res.status(200).json({
          dateKey,
          tasks: existingTasks,
          progress: existingProgress,
        });
      }
    }

    const activeCount = await Task.countDocuments({ isActive: true });
    const sampleSize = Math.min(activeCount, pickDailyCount());
    const sampledTasks = await Task.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: sampleSize } },
    ]);

    const normalizedTasks = sampledTasks.map((task) => ({
      ...task,
      id: task.taskId,
    }));

    const taskIds = normalizedTasks.map((task) => task.taskId);

    const progress = await UserTaskProgress.findOneAndUpdate(
      { user: userId, dateKey },
      {
        $setOnInsert: {
          user: userId,
          dateKey,
          taskIds,
          completedTaskIds: [],
          taskResults: {},
          xp: 0,
        },
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      dateKey,
      tasks: normalizedTasks,
      progress,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to get daily tasks", error: error.message });
  }
};

exports.getMyTaskProgress = async (req, res) => {
  try {
    const dateKey = req.query.dateKey || dateKeyFromDate(new Date());
    const progress = await UserTaskProgress.findOne({ user: req.user.id, dateKey });

    if (!progress) {
      return res.status(200).json({ dateKey, taskIds: [], completedTaskIds: [], taskResults: {}, xp: 0 });
    }

    return res.status(200).json(progress);
  } catch (error) {
    return res.status(500).json({ message: "Failed to get progress", error: error.message });
  }
};

exports.saveMyTaskProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const dateKey = req.body.dateKey || dateKeyFromDate(new Date());
    const taskIds = Array.isArray(req.body.taskIds) ? req.body.taskIds : [];
    const completedTaskIds = Array.isArray(req.body.completedTaskIds) ? req.body.completedTaskIds : [];
    const taskResults = req.body.taskResults && typeof req.body.taskResults === "object" ? req.body.taskResults : {};

    const xp = completedTaskIds.length * 10;

    const progress = await UserTaskProgress.findOneAndUpdate(
      { user: userId, dateKey },
      {
        $set: {
          taskIds,
          completedTaskIds,
          taskResults,
          xp,
        },
      },
      { new: true, upsert: true }
    );

    if (completedTaskIds.length > 0) {
      const user = await User.findById(userId);
      const now = new Date();

      if (user) {
        if (!user.lastTaskCompletedAt) {
          user.taskStreakCount = 1;
        } else {
          const lastDate = new Date(user.lastTaskCompletedAt);

          if (isSameDay(lastDate, now)) {
            user.taskStreakCount = user.taskStreakCount || 1;
          } else if (isYesterday(lastDate, now)) {
            user.taskStreakCount = (user.taskStreakCount || 0) + 1;
          } else {
            user.taskStreakCount = 1;
          }
        }

        user.lastTaskCompletedAt = now;
        await user.save();
      }
    }

    return res.status(200).json(progress);
  } catch (error) {
    return res.status(500).json({ message: "Failed to save progress", error: error.message });
  }
};
