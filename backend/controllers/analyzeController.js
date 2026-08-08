const Journal = require("../models/journalModel");
const Chat = require("../models/chatModels");
const OpenAI = require("openai");

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function getModelName() {
  return process.env.MODEL || "gpt-4o-mini";
}

// Map mood strings -> numeric score (1-10)
const MOOD_SCORES = {
  excited: 9, happy: 8, energetic: 8, grateful: 8,
  content: 7, calm: 7,
  busy: 5, tired: 4, sleepy: 4,
  lonely: 3, sad: 3, worried: 3, nervous: 3,
  anxious: 2, stressed: 2, overwhelmed: 2,
  depressed: 1, angry: 1, frustrated: 1, irritated: 2,
};

function moodToScore(mood) {
  if (!mood) return 5;
  const lower = mood.toLowerCase().trim();
  for (const [key, score] of Object.entries(MOOD_SCORES)) {
    if (lower.includes(key)) return score;
  }
  return 5; // neutral default
}

function scoreToLabel(score) {
  if (score >= 8) return "Excellent";
  if (score >= 6) return "Good";
  if (score >= 4) return "Fair";
  return "Needs Care";
}

function scoreToColor(score) {
  if (score >= 7) return "emerald";
  if (score >= 4.5) return "amber";
  return "red";
}

// Build a 30-day timeline array: [{date, score, mood}]
function buildMoodTimeline(journals) {
  const now = new Date();
  const timeline = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);

    // Find journals for this day
    const dayJournals = journals.filter((j) => {
      const jd = new Date(j.createdAt);
      return jd.toISOString().slice(0, 10) === key;
    });

    if (dayJournals.length > 0) {
      const avgScore =
        dayJournals.reduce((sum, j) => sum + moodToScore(j.mood), 0) /
        dayJournals.length;
      const dominantMood = dayJournals[0].mood || "neutral";
      timeline.push({ date: key, score: Math.round(avgScore * 10) / 10, mood: dominantMood });
    } else {
      timeline.push({ date: key, score: null, mood: null });
    }
  }

  return timeline;
}

// Build activity heatmap for the current week (Mon-Sun)
function buildWeeklyActivity(chats) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const counts = [0, 0, 0, 0, 0, 0, 0];

  const now = new Date();
  const startOfWeek = new Date(now);
  const dayOfWeek = startOfWeek.getDay(); // 0=Sun
  // shift to Monday
  startOfWeek.setDate(startOfWeek.getDate() - ((dayOfWeek + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);

  chats.forEach((chat) => {
    chat.messages.forEach((msg) => {
      if (msg.role !== "user") return;
      const msgDate = new Date(msg.createdAt || chat.updatedAt);
      if (msgDate >= startOfWeek) {
        const dayIdx = (msgDate.getDay() + 6) % 7; // shift so Mon=0
        counts[dayIdx]++;
      }
    });
  });

  const max = Math.max(...counts, 1);
  return days.map((day, i) => ({
    day,
    count: counts[i],
    level: Math.round((counts[i] / max) * 4), // 0-4 heat level
  }));
}

// Build busiest day-of-week stats
function buildDayOfWeekStats(chats) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  chats.forEach((chat) => {
    const d = new Date(chat.createdAt);
    counts[d.getDay()]++;
  });
  const maxIdx = counts.indexOf(Math.max(...counts));
  return days[maxIdx] || "N/A";
}

// Extract top themes using OpenAI from recent messages
async function extractTopThemes(recentMessages) {
  if (!openai || recentMessages.length === 0) {
    return ["wellness", "mindfulness", "goals", "daily life", "growth"];
  }

  const sample = recentMessages
    .filter((m) => m.role === "user" && m.content)
    .slice(-30)
    .map((m) => m.content.slice(0, 200))
    .join("\n");

  if (!sample.trim()) {
    return ["wellness", "mindfulness", "goals", "daily life", "growth"];
  }

  try {
    const resp = await openai.chat.completions.create({
      model: getModelName(),
      temperature: 0,
      max_tokens: 80,
      messages: [
        {
          role: "system",
          content:
            'Extract exactly 5 short topic tags (1-2 words each, lowercase) from the user messages below. Return ONLY a JSON array of strings, like: ["stress","mindfulness","work","sleep","goals"]',
        },
        { role: "user", content: sample },
      ],
    });

    const raw = resp.choices[0].message.content.trim();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : ["wellness", "goals", "mindfulness", "growth", "daily life"];
  } catch {
    return ["wellness", "goals", "mindfulness", "growth", "daily life"];
  }
}

// Generate a personalized AI insight paragraph
async function generatePersonalInsight(stats, avgWellbeing, topThemes, userName) {
  if (!openai) {
    return `Based on your recent activity, you've had ${stats.totalChats} conversations with Serani this month. Keep up your journaling streak — it's a powerful habit for emotional growth.`;
  }

  try {
    const prompt = `
User: ${userName}
Total chats this month: ${stats.totalChats}
Average messages per chat: ${stats.avgMessages}
Wellbeing score (1-10): ${avgWellbeing}
Top topics: ${topThemes.join(", ")}
Journal streak: ${stats.journalStreak} days

Write exactly 2 short, warm, personalized sentences (max 40 words total) as Serani AI giving the user a motivating personal insight about their patterns. Do not use lists or headers. Be human, caring, and specific to their data.`.trim();

    const resp = await openai.chat.completions.create({
      model: getModelName(),
      temperature: 0.8,
      max_tokens: 100,
      messages: [
        { role: "system", content: "You are Serani, a calming AI wellness companion." },
        { role: "user", content: prompt },
      ],
    });

    return resp.choices[0].message.content.trim();
  } catch {
    return `You've been showing up consistently — that's something to be proud of. Keep nurturing your growth, one conversation at a time.`;
  }
}

// Compute journal streak (consecutive days with at least 1 entry)
function computeJournalStreak(journals) {
  if (journals.length === 0) return 0;

  const dates = new Set(
    journals.map((j) => new Date(j.createdAt).toISOString().slice(0, 10))
  );

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dates.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

exports.getAnalysis = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const userName = req.user?.name || "User";

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch data in parallel
    const [journals, allChats] = await Promise.all([
      Journal.find({ user: userId, createdAt: { $gte: thirtyDaysAgo } })
        .select("mood moodConfidence createdAt tags")
        .sort({ createdAt: -1 })
        .lean(),
      Chat.find({ user: userId, createdAt: { $gte: thirtyDaysAgo } })
        .select("messages createdAt updatedAt")
        .lean(),
    ]);

    // Journal streak (all time)
    const allJournals = await Journal.find({ user: userId })
      .select("createdAt")
      .lean();
    const journalStreak = computeJournalStreak(allJournals);

    // --- Mood timeline (30 days) ---
    const moodTimeline = buildMoodTimeline(journals);

    // --- Wellbeing score ---
    const scoredMoods = journals
      .filter((j) => j.mood)
      .map((j) => moodToScore(j.mood));
    const avgWellbeing =
      scoredMoods.length > 0
        ? Math.round(
            (scoredMoods.reduce((a, b) => a + b, 0) / scoredMoods.length) * 10
          ) / 10
        : 5.0;

    const wellbeing = {
      score: avgWellbeing,
      label: scoreToLabel(avgWellbeing),
      color: scoreToColor(avgWellbeing),
    };

    // --- Chat stats ---
    const totalChats = allChats.length;
    const allMessages = allChats.flatMap((c) => c.messages);
    const userMessages = allMessages.filter((m) => m.role === "user");
    const avgMessages =
      totalChats > 0 ? Math.round(userMessages.length / totalChats) : 0;
    const busiestDay = buildDayOfWeekStats(allChats);

    const stats = {
      totalChats,
      totalMessages: userMessages.length,
      avgMessages,
      busiestDay,
      journalCount: journals.length,
      journalStreak,
    };

    // --- Weekly activity heatmap ---
    const weeklyActivity = buildWeeklyActivity(allChats);

    // --- Top themes (AI call) ---
    const topThemes = await extractTopThemes(userMessages);

    // --- AI personal insight (AI call) ---
    const insight = await generatePersonalInsight(stats, avgWellbeing, topThemes, userName);

    return res.status(200).json({
      moodTimeline,
      wellbeing,
      stats,
      weeklyActivity,
      topThemes,
      insight,
    });
  } catch (err) {
    console.error("getAnalysis error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
