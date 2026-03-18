const express = require("express");
const router = express.Router();
const Course = require("../models/courseModel");

const { enrollInCourse } = require("../controllers/courseController");

// requireAuth middleware should already exist in your system
const { protect } = require("../middleware/authMiddleware");

router.post("/:courseId/enroll", protect, enrollInCourse);
// Get all courses
router.get("/", async (req, res) => {
  try {
    const courses = await Course.find({
      isDeleted: false,
      isPublished: true,
    });
    // If no courses, return dummy data
    if (courses.length === 0) {
      const dummyCourses = [
        {
          _id: "dummy1",
          title: "Introduction to Mindfulness",
          instructorName: "Dr. Sarah Johnson",
          description:
            "Learn the basics of mindfulness meditation and how it can improve your mental health.",
          category: "Mindfulness",
          level: "Beginner",
          thumbnailUrl: "https://via.placeholder.com/400",
          isPublished: true,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: "dummy2",
          title: "Stress Management Techniques",
          instructorName: "Prof. Michael Chen",
          description:
            "Discover effective strategies to manage and reduce stress in your daily life.",
          category: "Stress",
          level: "Intermediate",
          thumbnailUrl: "https://via.placeholder.com/400",
          isPublished: true,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: "dummy3",
          title: "Sleep Better Tonight",
          instructorName: "Dr. Emily Davis",
          description:
            "Improve your sleep quality with proven techniques and habits.",
          category: "Sleep",
          level: "Beginner",
          thumbnailUrl: "https://via.placeholder.com/400",
          isPublished: true,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      return res.json(dummyCourses);
    }
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
