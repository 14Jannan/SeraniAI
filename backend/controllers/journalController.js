const Journal = require("../models/journalModel");
const { saveJournalEntry } = require("../utils/journalUtils");
const OpenAI = require("openai");

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function getModelName() {
  return process.env.MODEL || "gpt-4o-mini";
}

const MOOD_WHITELIST = [
  "happy",
  "sad",
  "anxious",
  "stressed",
  "calm",
  "neutral",
  "overwhelmed",
  "excited",
  "depressed",
  "angry",
  "lonely",
  "grateful",
  "hopeful",
  "tired",
];

const FALLBACK_MOOD_MAP = [
  { mood: "stressed", keywords: ["stress", "deadline", "pressure", "overwhelmed"] },
  { mood: "anxious", keywords: ["anxious", "nervous", "worried", "panic"] },
  { mood: "sad", keywords: ["sad", "down", "upset", "cry"] },
  { mood: "happy", keywords: ["happy", "joy", "great", "excited", "awesome"] },
  { mood: "grateful", keywords: ["grateful", "thankful", "blessed"] },
  { mood: "angry", keywords: ["angry", "mad", "frustrated", "annoyed"] },
  { mood: "tired", keywords: ["tired", "exhausted", "drained", "sleepy"] },
];

function normalizeMood(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  const lowered = value.trim().toLowerCase();
  if (!lowered) {
    return "";
  }

  if (MOOD_WHITELIST.includes(lowered)) {
    return lowered;
  }

  const fuzzy = MOOD_WHITELIST.find((mood) => lowered.includes(mood));
  return fuzzy || "";
}

function normalizeTags(tags) {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags
      .map((tag) => String(tag || "").trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  return String(tags)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function fallbackMoodAndInsight(content) {
  const text = String(content || "").toLowerCase();
  let mood = "neutral";

  for (const entry of FALLBACK_MOOD_MAP) {
    if (entry.keywords.some((word) => text.includes(word))) {
      mood = entry.mood;
      break;
    }
  }

  const summary = String(content || "")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .slice(0, 2)
    .join(" ")
    .slice(0, 280);

  return {
    mood,
    moodConfidence: 0.42,
    moodSource: "fallback",
    aiInsight: {
      summary: summary || "No summary available yet.",
      emotionalTone: `You seem ${mood}.`,
      keyThemes: [],
      suggestedAction: "Take one small positive step for your well-being today.",
      generatedAt: new Date(),
      provider: "fallback",
      model: "heuristic",
    },
  };
}

async function generateMoodAndInsight({ title, content, explicitMood }) {
  const manualMood = normalizeMood(explicitMood);
  if (!openai) {
    const fallback = fallbackMoodAndInsight(content);
    if (manualMood) {
      fallback.mood = manualMood;
      fallback.moodSource = "manual";
    }
    return fallback;
  }

  const prompt = {
    role: "user",
    content: JSON.stringify({
      title: title || "",
      content: content || "",
      explicitMood: manualMood || "",
      moodOptions: MOOD_WHITELIST,
    }),
  };

  try {
    const completion = await openai.chat.completions.create({
      model: getModelName(),
      temperature: 0.2,
      max_tokens: 280,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Analyze a journal entry. Return strict JSON with keys: mood, moodConfidence, summary, emotionalTone, keyThemes, suggestedAction. mood must be one of the provided moodOptions. moodConfidence must be between 0 and 1.",
        },
        prompt,
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    const aiMood = normalizeMood(parsed.mood);
    const mood = manualMood || aiMood || "neutral";

    return {
      mood,
      moodConfidence:
        typeof parsed.moodConfidence === "number"
          ? Math.max(0, Math.min(1, parsed.moodConfidence))
          : manualMood
            ? 1
            : 0.55,
      moodSource: manualMood ? "manual" : "ai",
      aiInsight: {
        summary: String(parsed.summary || "").trim(),
        emotionalTone: String(parsed.emotionalTone || "").trim(),
        keyThemes: Array.isArray(parsed.keyThemes)
          ? parsed.keyThemes.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 8)
          : [],
        suggestedAction: String(parsed.suggestedAction || "").trim(),
        generatedAt: new Date(),
        provider: "openai",
        model: getModelName(),
      },
    };
  } catch (err) {
    const fallback = fallbackMoodAndInsight(content);
    if (manualMood) {
      fallback.mood = manualMood;
      fallback.moodSource = "manual";
      fallback.moodConfidence = 1;
    }
    return fallback;
  }
}

function getStartOfDay(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function calculateStreak(days) {
  if (!days.length) {
    return 0;
  }

  const set = new Set(days.map((day) => getStartOfDay(day).toISOString()));
  let streak = 0;
  let cursor = getStartOfDay(new Date());

  while (set.has(cursor.toISOString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getRangeStart(timeRange) {
  const start = getStartOfDay(new Date());
  if (timeRange === "month") {
    start.setDate(start.getDate() - 29);
    return start;
  }

  start.setDate(start.getDate() - 6);
  return start;
}

async function generatePeriodInsight(userId, timeRange = "week") {
  const rangeStart = getRangeStart(timeRange);

  const journals = await Journal.find({
    user: userId,
    createdAt: { $gte: rangeStart },
  })
    .sort({ createdAt: -1 })
    .select("title content mood")
    .limit(timeRange === "month" ? 30 : 12);

  if (!journals.length) {
    return timeRange === "month"
      ? "No entries yet this month. Add a few reflections and I will map your monthly emotional trend."
      : "No entries yet this week. Start with one small reflection today.";
  }

  if (!openai) {
    return timeRange === "month"
      ? "Your monthly pattern is taking shape. Keep journaling regularly and notice what lifts your mood across the month."
      : "You are building consistency. Keep journaling and look for one repeating positive pattern this week.";
  }

  const context = journals
    .map((entry) => `Title: ${entry.title || "Untitled"}; Mood: ${entry.mood || "unknown"}; Content: ${entry.content}`)
    .join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: getModelName(),
      temperature: 0.3,
      max_tokens: 140,
      messages: [
        {
          role: "system",
          content:
            "Write a 2-3 sentence, warm journaling insight for a dashboard. Mention emotional trend in the provided period and one practical suggestion.",
        },
        {
          role: "user",
          content: `Time range: ${timeRange}. Analyze only this period.\n${context}`,
        },
      ],
    });

    return (
      completion.choices?.[0]?.message?.content?.trim() ||
      "Your reflections show progress. Keep focusing on one practical step each day."
    );
  } catch (err) {
    return "Your reflections show progress. Keep focusing on one practical step each day.";
  }
}

// Create new journal entry
const createJournal = async (req, res) => {
  try {
    const { title, content, mood, tags } = req.body;
    const normalizedTags = normalizeTags(tags);
    const analysis = await generateMoodAndInsight({
      title,
      content,
      explicitMood: mood,
    });

    const journal = await saveJournalEntry(req.user._id, {
      title,
      content,
      mood: analysis.mood,
      tags: normalizedTags,
      moodConfidence: analysis.moodConfidence,
      moodSource: analysis.moodSource,
      aiInsight: analysis.aiInsight,
    });

    res.status(201).json({
      success: true,
      message: "Journal entry created successfully",
      journal,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create journal entry",
      error: error.message,
    });
  }
};

// Get all journal entries of logged-in user
const getMyJournals = async (req, res) => {
  try {
    const journals = await Journal.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      journals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch journal entries",
      error: error.message,
    });
  }
};

// Get single journal entry
const getJournalById = async (req, res) => {
  try {
    const journal = await Journal.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!journal) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    res.status(200).json({
      success: true,
      journal,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch journal entry",
      error: error.message,
    });
  }
};

// Update journal entry
const updateJournal = async (req, res) => {
  try {
    const { title, content, mood, tags, isFavorite } = req.body;

    const journal = await Journal.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!journal) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    const nextTitle = title !== undefined ? title : journal.title;
    const nextContent = content !== undefined ? content : journal.content;
    const contentChanged = content !== undefined || title !== undefined;

    if (title !== undefined) journal.title = title;
    if (content !== undefined) journal.content = content;
    if (tags !== undefined) journal.tags = normalizeTags(tags);
    if (isFavorite !== undefined) journal.isFavorite = isFavorite;

    if (contentChanged || mood !== undefined) {
      const analysis = await generateMoodAndInsight({
        title: nextTitle,
        content: nextContent,
        explicitMood: mood !== undefined ? mood : journal.mood,
      });

      journal.mood = analysis.mood;
      journal.moodConfidence = analysis.moodConfidence;
      journal.moodSource = analysis.moodSource;
      journal.aiInsight = analysis.aiInsight;
    }

    const updatedJournal = await journal.save();

    res.status(200).json({
      success: true,
      message: "Journal entry updated successfully",
      journal: updatedJournal,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update journal entry",
      error: error.message,
    });
  }
};

const refreshJournalInsight = async (req, res) => {
  try {
    const journal = await Journal.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!journal) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    const analysis = await generateMoodAndInsight({
      title: journal.title,
      content: journal.content,
      explicitMood: journal.mood,
    });

    journal.mood = analysis.mood;
    journal.moodConfidence = analysis.moodConfidence;
    journal.moodSource = analysis.moodSource;
    journal.aiInsight = analysis.aiInsight;
    await journal.save();

    res.status(200).json({
      success: true,
      message: "Insight refreshed successfully",
      journal,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to refresh journal insight",
      error: error.message,
    });
  }
};

const getJournalSummary = async (req, res) => {
  try {
    const now = new Date();
    const moodRange = req.query.moodRange === "month" ? "month" : "week";
    const insightRange = req.query.insightRange === "month" ? "month" : "week";
    const moodRangeStart = getRangeStart(moodRange);
    const weekStart = getRangeStart("week");

    const [allJournals, moodRangeJournals, weekJournals] = await Promise.all([
      Journal.find({ user: req.user._id }).select("mood tags createdAt").lean(),
      Journal.find({ user: req.user._id, createdAt: { $gte: moodRangeStart } })
        .select("mood tags createdAt")
        .lean(),
      Journal.find({ user: req.user._id, createdAt: { $gte: weekStart } })
        .select("mood tags createdAt")
        .lean(),
    ]);

    const moodCounts = {};
    moodRangeJournals.forEach((entry) => {
      const mood = normalizeMood(entry.mood) || "neutral";
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });

    const tagCounts = {};
    allJournals.forEach((entry) => {
      (entry.tags || []).forEach((tag) => {
        const normalized = String(tag || "").trim().toLowerCase();
        if (!normalized) {
          return;
        }
        tagCounts[normalized] = (tagCounts[normalized] || 0) + 1;
      });
    });

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));

    const streak = calculateStreak(allJournals.map((entry) => entry.createdAt));
    const periodInsight = await generatePeriodInsight(req.user._id, insightRange);

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyActivity = weekDays.map((label, offset) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + offset);
      const dayStart = getStartOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const count = weekJournals.filter((entry) => {
        const createdAt = new Date(entry.createdAt);
        return createdAt >= dayStart && createdAt < dayEnd;
      }).length;

      return { label, count, date: dayStart };
    });

    res.status(200).json({
      success: true,
      summary: {
        moodCounts,
        topTags,
        streak,
        weeklyActivity,
        periodInsight,
        moodRange,
        insightRange,
        generatedAt: now,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch journal summary",
      error: error.message,
    });
  }
};

// Delete journal entry
const deleteJournal = async (req, res) => {
  try {
    const journal = await Journal.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!journal) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    await journal.deleteOne();


    res.status(200).json({
      success: true,
      message: "Journal entry deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete journal entry",
      error: error.message,
    });
  }
};

module.exports = {
  createJournal,
  getMyJournals,
  getJournalById,
  updateJournal,
  deleteJournal,
  refreshJournalInsight,
  getJournalSummary,
};