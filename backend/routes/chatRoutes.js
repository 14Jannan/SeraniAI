const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  sendMessage,
  getHistory,
  getSession,
  deleteSession,
  clearHistory,
} = require("../controllers/chatControllers");

router.post("/", protect, sendMessage);

router.get("/history", protect, getHistory);
router.get("/session/:id", protect, getSession);

router.delete("/history/:id", protect, deleteSession);
router.delete("/history", protect, clearHistory);

module.exports = router;
