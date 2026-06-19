const Journal = require("../models/journalModel");
const ChromaDBService = require("../services/chromaDBService");

// Initialize ChromaDB client for semantic vector indexing and retrieval.
const chromadb = new ChromaDBService();

// Persist a journal entry and normalize optional analysis metadata.
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

  // Index journal content in ChromaDB to support semantic retrieval and similarity search.
  try {
    await chromadb.addEmbedding(journal.content, "journals", {
      journalId: journal._id.toString(),
      userId: userId.toString(),
      title: journal.title,
      mood: journal.mood,
      timestamp: journal.createdAt.toISOString()
    });
  } catch (error) {
    // Graceful degradation: continue without failing if vector indexing is unavailable.
    console.error("Failed to index journal in ChromaDB:", error.message);
  }

  return journal;
};
