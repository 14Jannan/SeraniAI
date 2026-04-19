const Journal = require("../models/journalModel");
const { getOrCreateCollection } = require("../config/vectraClient");

/**
 * Shared utility to create a journal entry and index it in Vectra.
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

  // Vectorize in Vectra for semantic search
  try {
    const collection = await getOrCreateCollection();
    await collection.add({
      ids: [`journal-${journal._id}`],
      documents: [journal.content],
      metadatas: [{
        userId: userId.toString(),
        source: "journal",
        journalId: journal._id.toString(),
        timestamp: journal.createdAt.toISOString()
      }]
    });
  } catch (vErr) {
    console.error("Journal vectorization error:", vErr);
  }

  return journal;
};
