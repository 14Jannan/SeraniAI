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
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Only what the AI chat can actually make use of: text extraction supports
// PDF/plain-text (see extractTextFromFile), and images are shown inline in
// the conversation. Anything else (executables, HTML, archives, etc.) is
// rejected outright rather than being stored and served back statically.
const ALLOWED_CHAT_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_CHAT_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Unsupported file type"), false);
    }
    return cb(null, true);
  },
});

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
