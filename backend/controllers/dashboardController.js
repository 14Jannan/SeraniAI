const User = require("../models/userModel");
const Journal = require("../models/journalModel");
const Chat = require("../models/chatModels");
const Lesson = require("../models/lessonModel");
const UserTaskProgress = require("../models/userTaskProgressModel");
const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");
const mongoose = require("mongoose");
const OpenAI = require("openai");
const { decrypt } = require("../utils/encryption");

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// @desc    Get dashboard statistics
// @route   GET /api/users/dashboard-stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Fetch User (for name and lessonProgress)
    const user = await User.findById(userId).select("name lessonProgress");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Total Journals Count - lean query
    const totalJournals = await Journal.countDocuments({ user: userId });

    // 3. Completed Lessons Count
    const completedLessons = user.lessonProgress.length;

    // 4. Daily Tasks Count (for today) - use local date string
    const todayDate = new Date();
    // Ensure we get local YYYY-MM-DD without timezone offset
    const today = todayDate.getFullYear() + '-' + String(todayDate.getMonth() + 1).padStart(2, '0') + '-' + String(todayDate.getDate()).padStart(2, '0');
    const todayTaskProgress = await UserTaskProgress.findOne({ user: userId, dateKey: today }).lean();
    const dailyTasksCount = todayTaskProgress ? todayTaskProgress.taskIds.length : 0;

    // 5. AI Interactions Count (User messages) - use aggregation for scalability
    const aiInteractionAgg = await Chat.aggregate([
      { $match: { user: userId } },
      { $unwind: "$messages" },
      { $match: { "messages.role": "user" } },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]);
    const aiInteractions = (aiInteractionAgg[0] && aiInteractionAgg[0].count) || 0;

    // 6. Recent Activity (Mix of Journals and Chats)
    const recentJournals = await Journal.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    const recentChats = await Chat.find({ user: userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();
    // Combine and format activity
    let activities = [
      ...recentJournals.map((j) => ({
        type: "journal",
        title: j.title || "Untitled Journal",
        time: j.createdAt,
        id: j._id,
      })),
      ...recentChats.map((c) => ({
        type: "chat",
        title: decrypt(c.title) || "AI Chat session",
        time: c.updatedAt,
        id: c._id,
      })),
    ];

    // Sort combined activities by time desc
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    activities = activities.slice(0, 5);

    // 7. Journal Activity Trends (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const journalTrends = await Journal.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).allowDiskUse(true);

    // Fill in zeros for days without activity for Journal
    const dailyActivity = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayMatch = journalTrends.find(jt => jt._id === dateStr);
      dailyActivity.push(dayMatch ? dayMatch.count : 0);
    }

    // 7b. Chat Activity Trends
    const chatAgg = await Chat.aggregate([
      { $match: { user: userId } },
      { $unwind: "$messages" },
      { $match: { "messages.role": "user", "messages.createdAt": { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$messages.createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).allowDiskUse(true);

    const dailyChatActivity = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayMatch = chatAgg.find(jt => jt._id === dateStr);
      dailyChatActivity.push(dayMatch ? dayMatch.count : 0);
    }

    // 7c. Course Activity Trends
    const lessonAgg = {};
    if (user && user.lessonProgress) {
      user.lessonProgress.forEach(lp => {
        if (lp.updatedAt >= sevenDaysAgo) {
          const dateStr = lp.updatedAt.toISOString().split('T')[0];
          lessonAgg[dateStr] = (lessonAgg[dateStr] || 0) + 1;
        }
      });
    }

    const dailyCourseActivity = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      dailyCourseActivity.push(lessonAgg[dateStr] || 0);
    }

    // 8. Generate Smart Recommendations
    const recommendations = [];
    const currentHour = new Date().getHours();
    
    // Journal Check
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayJournalsCount = await Journal.countDocuments({ user: userId, createdAt: { $gte: startOfToday } });
    
    if (todayJournalsCount === 0) {
      let reason = "Suggested because you haven't journaled today.";
      if (currentHour >= 18 || currentHour < 5) {
        reason = "Perfect time to reflect on your day before bed.";
      } else if (currentHour >= 5 && currentHour < 12) {
        reason = "Start your morning with a clear mind.";
      }
      
      recommendations.push({
        id: "journal-today",
        type: "journal",
        priority: "high",
        title: "Start your daily reflection",
        reason: reason,
        actionType: "modal",
        dismissible: true
      });
    }

    // Task Check
    if (dailyTasksCount > 0) {
      let taskReason = `You have ${dailyTasksCount} tasks set for today.`;
      if (currentHour >= 5 && currentHour < 12) {
          taskReason = "Plan and tackle your tasks early today.";
      }
      recommendations.push({
        id: "tasks-today",
        type: "tasks",
        priority: "medium",
        title: "Complete your daily tasks",
        reason: taskReason,
        actionType: "navigate",
        link: "/dashboard/tasks",
        dismissible: true
      });
    }

    // Course Check
    const lessonProgress = user.lessonProgress || [];
    const completedLessonIds = lessonProgress
      .map(lp => lp.lessonId)
      .filter(id => id && mongoose.Types.ObjectId.isValid(id));

    const nextLesson = await Lesson.findOne({ _id: { $nin: completedLessonIds } }).sort({ createdAt: 1 }).lean();
    if (nextLesson) {
      let courseReason = "Pick up where you left off in your courses.";
      if (currentHour >= 12 && currentHour < 18) {
          courseReason = "A great afternoon to continue your learning journey.";
      }
      recommendations.push({
        id: "lesson-next",
        type: "courses",
        priority: "medium",
        title: `Continue learning: ${nextLesson.title}`,
        reason: courseReason,
        actionType: "navigate",
        link: "/dashboard/courses",
        dismissible: true
      });
    } else {
      recommendations.push({
        id: "explore-courses",
        type: "courses",
        priority: "medium",
        title: "Explore new courses",
        reason: "Discover our library of wellness and personal growth courses.",
        actionType: "navigate",
        link: "/dashboard/courses",
        dismissible: true
      });
    }

    // Wellness Check
    const todayMoodLog = await Journal.findOne({ user: userId, createdAt: { $gte: startOfToday }, mood: { $ne: "" } }).lean();
    if (!todayMoodLog) {
      recommendations.push({
          id: "wellness-check",
          type: "wellness",
          priority: "low",
          title: "Take a short wellness check-in",
          reason: "A quick check-in can help center your mind.",
          actionType: "modal",
          dismissible: true
      });
    }

    // Sort by priority (High -> Medium -> Low)
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const completionStatus = {
        allDone: recommendations.length === 0,
        message: "Great job today! You’ve completed all your recommended activities."
    };

    // 5b. Recently Accessed Lessons
    let recentLessons = [];
    if (user.lessonProgress && user.lessonProgress.length > 0) {
      const sortedProgress = [...user.lessonProgress].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 4);
      const lessonIds = sortedProgress.map(lp => lp.lessonId);
      
      const lessonDetails = await Lesson.find({ _id: { $in: lessonIds } })
        .populate("courseId", "title")
        .lean();

      recentLessons = sortedProgress.map(lp => {
        const detail = lessonDetails.find(ld => ld._id.toString() === lp.lessonId.toString());
        return {
          _id: lp.lessonId,
          title: detail ? detail.title : "Unknown Lesson",
          courseId: detail?.courseId?._id || null,
          courseTitle: detail?.courseId?.title || "Unknown Course",
          thumbnailUrl: detail?.thumbnail || "",
          lastAccessedAt: lp.updatedAt
        };
      });
    }

    res.json({
      userName: user.name,
      stats: {
        totalJournals,
        dailyTasks: dailyTasksCount,
        completedLessons,
        aiInteractions,
      },
      recentActivity: activities,
      recentLessons,
      journalTrends: dailyActivity,
      chatTrends: dailyChatActivity,
      courseTrends: dailyCourseActivity,
      recommendations,
      completionStatus
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Server error retrieving stats" });
  }
};

// @desc    Generate weekly AI report
// @route   GET /api/users/weekly-report
// @access  Private
exports.getWeeklyReport = async (req, res) => {
  try {
    const userId = req.user._id;
    const sevenDaysAgo = new Date();
    // Start from local midnight
    sevenDaysAgo.setHours(0, 0, 0, 0);
    // Subtract 7 days to get exact 7‑day window (excluding today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const now = new Date();
    // No need to modify now; use as upper bound in queries
    

    // 1. Fetch data from last 7 days using lean queries and local date range
    const [journals, chats] = await Promise.all([
      Journal.find({
        user: userId,
        createdAt: { $gte: sevenDaysAgo, $lt: now }
      })
        .select("title content createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      Chat.find({
        user: userId,
        updatedAt: { $gte: sevenDaysAgo, $lt: now }
      })
        .select("title updatedAt messages")
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean()
    ]);

    if (!openai) {
      return res.status(500).json({ message: "AI service not configured" });
    }

    // 2. Build a concise, structured context for the AI
    const contextParts = [];
    contextParts.push("USER ACTIVITY IN THE LAST 7 DAYS:\n");

    if (journals.length > 0) {
      const journalSummary = journals.map(j => `- ${j.title || "Untitled"} (${j.createdAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })})`).join("\n");
      contextParts.push("--- JOURNAL ENTRIES (titles) ---\n" + journalSummary + "\n\n");
    } else {
      contextParts.push("No journal entries this week.\n\n");
    }

    if (chats.length > 0) {
      const chatSummary = chats.map(c => `- ${decrypt(c.title) || "New Chat"} (${c.updatedAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })})`).join("\n");
      contextParts.push("--- RECENT CHAT TOPICS ---\n" + chatSummary + "\n\n");
    } else {
      contextParts.push("No AI chat interactions this week.\n\n");
    }

    const context = contextParts.join("");

    // 3. Call AI to generate report with a more specific system prompt
    const response = await openai.chat.completions.create({
      model: process.env.MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an empathetic personal growth assistant. Analyze the provided weekly user activity (journal excerpts and chat topics) and generate a concise 'Weekly Progress Report'. Use **BOLD** (markdown like **Section**) for section headers: **Emotional Trends**, **Learning Progress**, and **Goals for Next Week**. Highlight positive patterns, suggest improvements, and keep the tone warm, professional, and encouraging. Keep the report under 800 words."
        },
        {
          role: "user",
          content: context
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    // Safely extract the report content from AI response
    let report = "";
    if (
      response &&
      response.choices &&
      response.choices[0] &&
      response.choices[0].message &&
      typeof response.choices[0].message.content === "string"
    ) {
      report = response.choices[0].message.content;
    } else {
      console.error("Unexpected AI response format:", response);
      return res
        .status(500)
        .json({ message: "AI response missing expected content" });
    }


    // Send the generated report back to the client
    res.json({ report });
  } catch (error) {
    console.error("Weekly report error:", error);
    res.status(500).json({ message: "Server error generating report" });
  }
};
