const User = require("../models/userModel");

function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isYesterday(lastDate, today) {
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  return (
    lastDate.getFullYear() === yesterday.getFullYear() &&
    lastDate.getMonth() === yesterday.getMonth() &&
    lastDate.getDate() === yesterday.getDate()
  );
}

exports.completeLessonAndUpdateStreak = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.lastLessonCompletedAt) {
      const lastDate = new Date(user.lastLessonCompletedAt);

      // already counted today
      if (isSameDay(lastDate, today)) {
        return res.status(200).json({
          message: "Streak already counted for today",
          streakCount: user.streakCount,
        });
      }

      // completed yesterday -> continue streak
      if (isYesterday(lastDate, today)) {
        user.streakCount += 1;
      } else {
        // missed one or more days -> reset and start again
        user.streakCount = 1;
      }
    } else {
      // first ever completed lesson
      user.streakCount = 1;
    }

    user.lastLessonCompletedAt = today;
    await user.save();

    return res.status(200).json({
      message: "Streak updated successfully",
      streakCount: user.streakCount,
      lastLessonCompletedAt: user.lastLessonCompletedAt,
    });
  } catch (error) {
    console.error("Error updating streak:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getMyStreak = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select("streakCount lastLessonCompletedAt taskStreakCount lastTaskCompletedAt");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      streakCount: user.streakCount || 0,
      lastLessonCompletedAt: user.lastLessonCompletedAt,
      taskStreakCount: user.taskStreakCount || 0,
      lastTaskCompletedAt: user.lastTaskCompletedAt,
    });
  } catch (error) {
    console.error("Error getting streak:", error);
    return res.status(500).json({ message: "Server error" });
  }
};