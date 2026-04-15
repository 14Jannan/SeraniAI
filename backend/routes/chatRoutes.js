const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const {
  sendMessage,
  getHistory,
  getSession,
  deleteSession,
  clearHistory,
} = require("../controllers/chatControllers");

router.post("/", protect, upload.single("file"), sendMessage);

router.get("/history", protect, getHistory);
router.get("/session/:id", protect, getSession);

router.delete("/history/:id", protect, deleteSession);
router.delete("/history", protect, clearHistory);

module.exports = router;
