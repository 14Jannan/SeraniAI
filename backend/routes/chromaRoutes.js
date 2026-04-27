const express = require("express");
const ChromaDBService = require("../services/chromaDBService");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const chromadb = new ChromaDBService();

/**
 * @route   GET /api/chroma/health
 * @desc    Check ChromaDB service health
 * @access  Public
 */
router.get("/health", async (req, res) => {
  try {
    const health = await chromadb.health();
    res.json(health);
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});

/**
 * @route   POST /api/chroma/journal/index
 * @desc    Index a journal entry for semantic search
 * @access  Private
 */
router.post("/journal/index", protect, async (req, res) => {
  try {
    const { content, journalId, metadata } = req.body;
    if (!content || !journalId) {
      return res.status(400).json({ error: "Content and journalId required" });
    }

    const docId = await chromadb.addEmbedding(content, "journals", {
      journalId,
      userId: req.user.id,
      timestamp: new Date().toISOString(),
      ...metadata,
    });

    res.json({ success: true, docId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/chroma/journal/search
 * @desc    Search journals by semantic similarity
 * @access  Private
 */
router.post("/journal/search", protect, async (req, res) => {
  try {
    const { query, nResults = 5 } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    const results = await chromadb.search(query, "journals", nResults);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/chroma/course/index
 * @desc    Index course content for semantic search
 * @access  Private
 */
router.post("/course/index", protect, async (req, res) => {
  try {
    const { content, courseId, lessonId, metadata } = req.body;
    if (!content || !courseId) {
      return res.status(400).json({ error: "Content and courseId required" });
    }

    const docId = await chromadb.addEmbedding(content, "courses", {
      courseId,
      lessonId,
      timestamp: new Date().toISOString(),
      ...metadata,
    });

    res.json({ success: true, docId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/chroma/course/search
 * @desc    Search courses by semantic similarity
 * @access  Private
 */
router.post("/course/search", protect, async (req, res) => {
  try {
    const { query, nResults = 5 } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    const results = await chromadb.search(query, "courses", nResults);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/chroma/chat/index
 * @desc    Index chat messages for semantic search
 * @access  Private
 */
router.post("/chat/index", protect, async (req, res) => {
  try {
    const { message, messageId, chatSessionId, metadata } = req.body;
    if (!message || !messageId) {
      return res.status(400).json({ error: "Message and messageId required" });
    }

    const docId = await chromadb.addEmbedding(message, "chat_messages", {
      messageId,
      chatSessionId,
      userId: req.user.id,
      timestamp: new Date().toISOString(),
      ...metadata,
    });

    res.json({ success: true, docId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/chroma/chat/search
 * @desc    Search chat messages by semantic similarity
 * @access  Private
 */
router.post("/chat/search", protect, async (req, res) => {
  try {
    const { query, nResults = 5 } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    const results = await chromadb.search(query, "chat_messages", nResults);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/chroma/stats/:collection
 * @desc    Get collection statistics
 * @access  Private
 */
router.get("/stats/:collection", protect, async (req, res) => {
  try {
    const { collection } = req.params;
    const validCollections = ["journals", "courses", "chat_messages", "users"];

    if (!validCollections.includes(collection)) {
      return res.status(400).json({ error: "Invalid collection" });
    }

    const count = await chromadb.getCollectionCount(collection);
    res.json({ collection, count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
