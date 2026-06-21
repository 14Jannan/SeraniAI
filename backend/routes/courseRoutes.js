const express = require("express");
const router = express.Router();
const Course = require("../models/courseModel");

const { enrollInCourse } = require("../controllers/courseController");
const { getCache, setCache } = require("../utils/cache");

// requireAuth middleware should already exist in your system
const { protect } = require("../middleware/authMiddleware");

router.post("/:courseId/enroll", protect, enrollInCourse);
// Get all courses
router.get("/", async (req, res) => {
  try {
    const cacheKey = "courses:all";
    const cachedCourses = await getCache(cacheKey);
    if (cachedCourses) {
      return res.json(cachedCourses);
    }

    const courses = await Course.find({
      isDeleted: false,
      isPublished: true,
    });

    await setCache(cacheKey, courses, 300); // cache for 5 minutes
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
