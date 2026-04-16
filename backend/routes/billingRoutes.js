const express = require("express");
const router = express.Router();

const {
  initializePayHerePayment,
  handlePayHereNotify,
  confirmPayHereReturn,
} = require("../controllers/billingController");
const { protect } = require("../middleware/authMiddleware");

router.post("/payhere", protect, initializePayHerePayment);
router.post("/payhere/notify", handlePayHereNotify);
router.post("/payhere/confirm-return", protect, confirmPayHereReturn);

module.exports = router;
