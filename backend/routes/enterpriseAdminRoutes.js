const express = require("express");
const router = express.Router();
const {
  getEnterpriseUsers,
  addUserToEnterprise,
  updateEnterpriseUser,
  deactivateEnterpriseUser,
  deleteEnterpriseUser,
} = require("../controllers/enterpriseAdminController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

router.use(protect, authorize("enterpriseAdmin"));

// Get all users in enterprise
router.route("/users").get(getEnterpriseUsers).post(addUserToEnterprise);

// Update, deactivate, delete user
router.route("/users/:id")
  .put(updateEnterpriseUser)
  .delete(deleteEnterpriseUser);

// Deactivate user endpoint
router.route("/users/:id/deactivate").patch(deactivateEnterpriseUser);

module.exports = router;
