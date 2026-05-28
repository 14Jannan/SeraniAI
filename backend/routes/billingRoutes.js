const express = require("express");
const router = express.Router();

const {
  initializePayHerePayment,
  handlePayHereNotify,
  confirmPayHereReturn,
  launchPayHereCheckout,
} = require("../controllers/billingController");
const { protect } = require("../middleware/authMiddleware");

router.post("/payhere", protect, initializePayHerePayment);
router.post("/payhere/notify", handlePayHereNotify);
router.get("/payhere/launch/:orderId", launchPayHereCheckout);
router.post("/payhere/confirm-return", protect, confirmPayHereReturn);

module.exports = router;
