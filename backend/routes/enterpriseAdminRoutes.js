const express = require("express");
const router = express.Router();
/* Import enterprise admin controller functions */
const {
  getEnterpriseUsers,
  addUserToEnterprise,
  updateEnterpriseUser,
  deactivateEnterpriseUser,
  deleteEnterpriseUser,
  revokeEnterpriseInvite,
} = require("../controllers/enterpriseAdminController");
/* Import authentication and authorization middleware */
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

/* All routes require authentication and enterpriseAdmin role */
router.use(protect, authorize("enterpriseAdmin"));

/* Get all enterprise users and add new users */
router.route("/users").get(getEnterpriseUsers).post(addUserToEnterprise);

/* Update or delete a specific user */
router.route("/users/:id")
  .put(updateEnterpriseUser)
  .delete(deleteEnterpriseUser);

/* Deactivate a specific user */
router.route("/users/:id/deactivate").patch(deactivateEnterpriseUser);

/* Revoke a pending enterprise invitation */
router.route("/invites/:id/revoke").patch(revokeEnterpriseInvite);

module.exports = router;
