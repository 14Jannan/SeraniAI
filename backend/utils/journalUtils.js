const Journal = require("../models/journalModel");
const { getOrCreateCollection } = require("../config/chromaClient");

/**
 * Shared utility to create a journal entry and index it in ChromaDB.
 * @param {string} userId - The ID of the user.
 * @param {object} journalData - The journal details { title, content, mood, tags }.
 * @returns {Promise<object>} The created journal entry.
 */
exports.saveJournalEntry = async (userId, { title, content, mood, tags }) => {
  if (!content || content.trim() === "") {
    throw new Error("Journal content is required");
  }

  const journal = await Journal.create({
    user: userId,
    title: title || "",
    content: content.trim(),
    mood: mood || "",
    tags: Array.isArray(tags) ? tags : [],
  });

  // Vectorize in ChromaDB for semantic search
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
