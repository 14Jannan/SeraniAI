const express = require("express");
const router = express.Router();

const {
  createJournal,
  getMyJournals,
  getJournalById,
  updateJournal,
  deleteJournal,
  refreshJournalInsight,
  getJournalSummary,
} = require("../controllers/journalController");

const { protect } = require("../middleware/authMiddleware");

// Protected routes
router.post("/", protect, createJournal);
router.get("/", protect, getMyJournals);
router.get("/stats/summary", protect, getJournalSummary);
router.post("/:id/refresh-insight", protect, refreshJournalInsight);
router.get("/:id", protect, getJournalById);
router.put("/:id", protect, updateJournal);
router.delete("/:id", protect, deleteJournal);

module.exports = router;