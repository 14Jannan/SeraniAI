const express = require("express");
const router = express.Router();

// Import controller functions (Ensure these names match your authController.js exports)
const { 
    registerUser, 
    loginUser, 
    verifyEmail 
} = require("../controllers/authController");

router.post("/register", registerUser);
router.post("/login", loginUser);

// Changed to POST because we are sending the OTP in the body, not the URL
router.post("/verify", verifyEmail); 

module.exports = router;