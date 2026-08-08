const express = require("express");
const router = express.Router();

/* Import billing controller functions for PayHere payment processing */
const {
  initializePayHerePayment,
  handlePayHereNotify,
  confirmPayHereReturn,
  launchPayHereCheckout,
  handlePayHereReturnRedirect,
  handlePayHereCancelRedirect,
} = require("../controllers/billingController");
/* Import authentication middleware */
const { protect } = require("../middleware/authMiddleware");

/* Initialize PayHere payment - requires authentication */
router.post("/payhere", protect, initializePayHerePayment);
/* Handle PayHere payment notification webhook - public endpoint */
router.post("/payhere/notify", handlePayHereNotify);
/* Handle PayHere payment return redirect - public GET endpoint */
router.get("/payhere/return", handlePayHereReturnRedirect);
/* Handle PayHere payment cancel redirect - public GET endpoint */
router.get("/payhere/cancel", handlePayHereCancelRedirect);
/* Launch PayHere checkout page for specific order */
router.get("/payhere/launch/:orderId", launchPayHereCheckout);
/* Confirm payment return - requires authentication */
router.post("/payhere/confirm-return", protect, confirmPayHereReturn);

module.exports = router;
