const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");

const {
  getAdminCourseDashboard,
  getAdminCourses,
  getAdminCategories,
  createAdminCategory,
  deleteAdminCategory,
  createCourse,
  createLesson,
  deleteCourse,
  updateCourse
} = require("../controllers/adminCourseController");

// Dashboard
router.get("/course-dashboard", getAdminCourseDashboard);

// Get all admin courses
router.get("/courses", getAdminCourses);

// Categories
router.get("/categories", getAdminCategories);
router.post("/categories", createAdminCategory);
router.delete("/categories/:id", deleteAdminCategory);

// Create course (WITH thumbnail upload)
router.post("/courses", upload.single("thumbnail"), createCourse);

// Lessons
router.post("/courses/:courseId/lessons", createLesson);

// Delete
router.delete("/courses/:id", deleteCourse);

// Update
router.put("/courses/:id", upload.single("thumbnail"), updateCourse);

module.exports = router;
