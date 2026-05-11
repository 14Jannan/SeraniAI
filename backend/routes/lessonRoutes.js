const express = require("express");
const router = express.Router();

const lessonController = require("../controllers/lessonController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.post(
"/",
protect,
authorize("admin"),
upload.fields([
{ name: "thumbnail", maxCount: 1 },
{ name: "video", maxCount: 1 }
]),
lessonController.createLesson
);

router.get("/course/:courseId", lessonController.getLessonsByCourse);

router.get("/:lessonId/personal-notes", protect, lessonController.getLessonPersonalNotes);

router.put("/:lessonId/personal-notes", protect, lessonController.saveLessonPersonalNotes);

router.put(
"/:id",
protect,
authorize("admin"),
upload.fields([
{ name: "thumbnail", maxCount: 1 },
{ name: "video", maxCount: 1 }
]),
lessonController.updateLesson
);

router.delete("/:id", protect, authorize("admin"), lessonController.deleteLesson);

module.exports = router;