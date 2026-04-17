const express = require("express");
const router = express.Router();

// Import Middleware (Destructuring is important here!)
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const {
  getDashboardStats,
  getWeeklyReport,
} = require("../controllers/dashboardController");

// 1. Admin Only Route
router.get("/admin", protect, authorize("admin"), (req, res) => {
  res.json({ message: "Welcome Admin" });
});

// 2. Enterprise User & Admin Route
router.get(
  "/enterprise",
  protect,
  authorize("admin", "enterpriseUser"),
  (req, res) => {
    res.json({ message: "Welcome Enterprise User" });
  },
);

// 3. All Users Route (User, Admin, Enterprise User)
router.get(
  "/user",
  protect,
  authorize("admin", "enterpriseUser", "user"),
  (req, res) => {
    res.json({ message: "Welcome User" });
  },
);

// 4. Dashboard Stats Route
router.get("/dashboard-stats", protect, getDashboardStats);

// 5. Weekly Report Route
router.get("/weekly-report", protect, getWeeklyReport);

module.exports = router;
