const User = require("../models/userModel");
const Journal = require("../models/journalModel");
const Chat = require("../models/chatModels");
const Lesson = require("../models/lessonModel");
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

    // 2. Total Journals Count
    const totalJournals = await Journal.countDocuments({ user: userId });

    // 3. Completed Lessons Count
    const completedLessons = user.lessonProgress.length;

    // 4. Active Courses (Unique courses from lessonProgress)
    const lessonIds = user.lessonProgress.map((lp) => lp.lessonId);
    let activeCoursesCount = 0;
    if (lessonIds.length > 0) {
      const uniqueCourses = await Lesson.find({ _id: { $in: lessonIds } }).distinct("courseId");
      activeCoursesCount = uniqueCourses.length;
    }

    // 5. AI Interactions Count (User messages)
    const chats = await Chat.find({ user: userId });
    let aiInteractions = 0;
    chats.forEach((chat) => {
      aiInteractions += chat.messages.filter((m) => m.role === "user").length;
    });

    // 6. Recent Activity (Mix of Journals and Chats)
    const recentJournals = await Journal.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentChats = await Chat.find({ user: userId })
      .sort({ updatedAt: -1 })
      .limit(5);

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
    ]);

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
        activeCourses: activeCoursesCount,
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
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1. Fetch data from last 7 days
    const journals = await Journal.find({
      user: userId,
      createdAt: { $gte: sevenDaysAgo }
    }).select("title content createdAt");

    const chats = await Chat.find({
      user: userId,
      updatedAt: { $gte: sevenDaysAgo }
    }).select("title updatedAt");

    if (!openai) {
      return res.status(500).json({ message: "AI service not configured" });
    }

    // 2. Prepare context for AI
    let context = "USER ACTIVITY IN THE LAST 7 DAYS:\n\n";
    
    if (journals.length > 0) {
      context += "--- JOURNAL ENTRIES ---\n";
      journals.forEach(j => {
        context += `Title: ${j.title || "Untitled"}\nContent: ${j.content}\nDate: ${j.createdAt.toDateString()}\n\n`;
      });
    } else {
      context += "No journal entries this week.\n\n";
    }

    if (chats.length > 0) {
      context += "--- RECENT CHAT TOPICS ---\n";
      chats.forEach(c => {
        context += `- ${c.title || "New Chat"} (${c.updatedAt.toDateString()})\n`;
      });
    } else {
      context += "No AI chat interactions this week.\n\n";
    }

    // 3. Call AI to generate report
    const response = await openai.chat.completions.create({
      model: process.env.MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an empathetic personal growth assistant. Your task is to generate a 'Weekly Progress Report' based on the user's journals and chat activity. Format the report using the following sections: 'Emotional Trends', 'Learning Progress', and 'Goals for Next Week'. Use a warm, professional, and encouraging tone. If data is sparse, provide gentle encouragement and general guidance for reflection."
        },
        {
          role: "user",
          content: context
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const report = response.choices[0].message.content;

    res.json({ report });
  } catch (error) {
    console.error("Weekly report error:", error);
    res.status(500).json({ message: "Server error generating report" });
  }
};
