const express = require("express");
const router = express.Router();
const {
  completeLessonAndUpdateStreak,
  getMyStreak,
} = require("../controllers/streakController");


const { protect } = require("../middleware/authMiddleware");

router.post("/complete-lesson", protect, completeLessonAndUpdateStreak);
router.get("/me", protect, getMyStreak);

module.exports = router;