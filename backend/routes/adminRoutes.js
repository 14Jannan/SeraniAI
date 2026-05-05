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
const validateRequest = require("../middleware/validateRequest");
const {
  createAdminUserSchema,
  updateAdminUserSchema,
} = require("../validations/adminValidation");
const adminCourseRoutes = require("./adminCourseRoutes");

router.use(protect, authorize("admin"));

router
  .route("/users")
  .get(getAllUsers)
  .post(validateRequest(createAdminUserSchema), createUser);

router
  .route("/users/:id")
  .put(validateRequest(updateAdminUserSchema), updateUser)
  .delete(deleteUser);

// Admin course management routes
router.use("/", adminCourseRoutes);

module.exports = router;