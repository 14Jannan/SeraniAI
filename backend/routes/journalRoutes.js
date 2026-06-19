const express = require("express");
const router = express.Router();

// Import all journal controller handlers for CRUD and analytics operations.
const {
  createJournal,
  getMyJournals,
  getJournalById,
  updateJournal,
  deleteJournal,
  refreshJournalInsight,
  getJournalSummary,
} = require("../controllers/journalController");

// Import authentication middleware to protect all journal endpoints.
const { protect } = require("../middleware/authMiddleware");

// All journal routes require authenticated access via protect middleware.
// POST / - Create a new journal entry
router.post("/", protect, createJournal);
// GET / - Retrieve all entries for authenticated user
router.get("/", protect, getMyJournals);
// GET /stats/summary - Aggregate mood, tags, streak, and weekly activity
router.get("/stats/summary", protect, getJournalSummary);
// POST /:id/refresh-insight - Regenerate AI analysis for existing entry
router.post("/:id/refresh-insight", protect, refreshJournalInsight);
// GET /:id - Retrieve specific entry (must belong to authenticated user)
router.get("/:id", protect, getJournalById);
// PUT /:id - Update entry fields and optionally regenerate mood/insight
router.put("/:id", protect, updateJournal);
// DELETE /:id - Permanently remove entry
router.delete("/:id", protect, deleteJournal);

module.exports = router;
