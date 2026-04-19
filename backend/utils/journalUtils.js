const Journal = require("../models/journalModel");
const ChromaDBService = require("../services/chromaDBService");

const chromadb = new ChromaDBService();

/**
 * Shared utility to create a journal entry.
 * @param {string} userId - The ID of the user.
 * @param {object} journalData - The journal details { title, content, mood, tags, moodConfidence, moodSource, aiInsight }.
 * @returns {Promise<object>} The created journal entry.
 */
exports.saveJournalEntry = async (
  userId,
  { title, content, mood, tags, moodConfidence, moodSource, aiInsight }
) => {
  if (!content || content.trim() === "") {
    throw new Error("Journal content is required");
  }

  const journal = await Journal.create({
    user: userId,
    title: title || "",
    content: content.trim(),
    mood: mood || "",
    tags: Array.isArray(tags) ? tags : [],
    moodConfidence:
      typeof moodConfidence === "number" && Number.isFinite(moodConfidence)
        ? moodConfidence
        : null,
    moodSource: moodSource || (mood ? "manual" : "fallback"),
    aiInsight:
      aiInsight && typeof aiInsight === "object"
        ? {
            summary: aiInsight.summary || "",
            emotionalTone: aiInsight.emotionalTone || "",
            keyThemes: Array.isArray(aiInsight.keyThemes)
              ? aiInsight.keyThemes
              : [],
            suggestedAction: aiInsight.suggestedAction || "",
            generatedAt: aiInsight.generatedAt || undefined,
            provider: aiInsight.provider || "",
            model: aiInsight.model || "",
          }
        : undefined,
  });

  // Index in ChromaDB for semantic search
  try {
    await chromadb.addEmbedding(journal.content, "journals", {
      journalId: journal._id.toString(),
      userId: userId.toString(),
      title: journal.title,
      mood: journal.mood,
      timestamp: journal.createdAt.toISOString()
    });
  } catch (error) {
    console.error("Failed to index journal in ChromaDB:", error.message);
    // We don't throw here to ensure the journal creation still succeeds
  }

  return journal;
};
