const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/chatUploadMiddleware");

const {
  sendMessage,
  getHistory,
  getSession,
  deleteSession,
  clearHistory,
} = require("../controllers/chatControllers");

const { getAnalysis } = require("../controllers/analyzeController");

router.post("/", protect, upload.single("file"), sendMessage);

router.get("/history", protect, getHistory);
router.get("/session/:id", protect, getSession);

router.delete("/history/:id", protect, deleteSession);
router.delete("/history", protect, clearHistory);

router.get("/analyze", protect, getAnalysis);

module.exports = router;
