const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const adminCourseRoutes = require("./adminCourseRoutes");

router.use(protect, authorize("admin"));

router.route("/users").get(getAllUsers).post(createUser); // getting all users and creating new user

router.route("/users/:id").put(updateUser).delete(deleteUser); // updating and deleting a specific user

// Admin course management routes
router.use("/", adminCourseRoutes);

module.exports = router;
