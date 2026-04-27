const User = require("../models/userModel");
const Journal = require("../models/journalModel");
const Chat = require("../models/chatModels");
const Lesson = require("../models/lessonModel");
const UserTaskProgress = require("../models/userTaskProgressModel");
const OpenAI = require("openai");

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
        title: c.title || "AI Chat session",
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

    // Fill in zeros for days without activity
    const dailyActivity = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayMatch = journalTrends.find(jt => jt._id === dateStr);
      dailyActivity.push(dayMatch ? dayMatch.count : 0);
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
      journalTrends: dailyActivity,
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
      const chatSummary = chats.map(c => `- ${c.title || "New Chat"} (${c.updatedAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })})`).join("\n");
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
          content: "You are an empathetic personal growth assistant. Analyze the provided weekly user activity (journal excerpts and chat topics) and generate a concise 'Weekly Progress Report' with three sections: 'Emotional Trends', 'Learning Progress', and 'Goals for Next Week'. Highlight positive patterns, suggest improvements, and keep the tone warm, professional, and encouraging. Keep the report under 800 words."
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
