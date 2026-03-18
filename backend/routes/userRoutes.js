const express = require("express");
const router = express.Router();

// Import Middleware (Destructuring is important here!)
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

// 1. Admin Only Route
router.get("/admin", protect, authorize("admin"), (req, res) => {
    res.json({ message: "Welcome Admin" });
});

// 2. Enterprise & Admin Route
router.get("/enterprise", protect, authorize("admin", "enterprise"), (req, res) => {
    res.json({ message: "Welcome Enterprise User" });
});

// 3. All Users Route (User, Admin, Enterprise)
router.get("/user", protect, authorize("admin", "enterprise", "user"), (req, res) => {
    res.json({ message: "Welcome User" });
});

module.exports = router;