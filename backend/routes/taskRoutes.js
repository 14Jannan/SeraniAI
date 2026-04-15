const express = require("express");
const {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getDailyTasks,
  getMyTaskProgress,
  saveMyTaskProgress,
} = require("../controllers/taskController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/daily", protect, getDailyTasks);
router.get("/progress/me", protect, getMyTaskProgress);
router.post("/progress/me", protect, saveMyTaskProgress);

router.get("/", protect, getTasks);
router.post("/", protect, authorize("admin"), createTask);
router.put("/:id", protect, authorize("admin"), updateTask);
router.delete("/:id", protect, authorize("admin"), deleteTask);

module.exports = router;
