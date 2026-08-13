const express = require("express");
const router = express.Router();
const passport = require("passport");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const rateLimit = require("../middleware/rateLimit");

const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationOtpSchema,
  onboardingSchema,
} = require("../validations/authValidation");
// Import your existing controllers
const {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationOtp,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  logoutUser,
  getOAuthProviderToken,
  getCurrentUser,
  deleteCurrentUser,
  acceptEnterpriseInvite,
  cancelEnterprisePremiumAccess,
  updateOnboarding,
  generateAuthTokens,
  setRefreshCookie,
} = require("../controllers/authController");

// =============================
// 🔐 LOCAL AUTH ROUTES
// =============================

// Brute-force protection: these endpoints accept a secret (password or OTP)
// that can otherwise be guessed via unlimited automated attempts. Keyed by
// IP + email so one abusive client can't lock out every other user sharing
// the same NAT/IP.
const emailKey = (prefix) => (req) =>
  `${prefix}:${req.ip}:${String(req.body?.email || "").toLowerCase()}`;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please try again in a few minutes.",
  keyGenerator: emailKey("login"),
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: "Too many attempts. Please try again in a few minutes.",
  keyGenerator: emailKey("otp"),
});

router.post("/register", validateRequest(registerSchema), registerUser);
router.post("/login", loginLimiter, validateRequest(loginSchema), loginUser);
router.post(
  "/forgot-password",
  otpLimiter,
  validateRequest(forgotPasswordSchema),
  forgotPassword,
);
router.post(
  "/reset-password",
  otpLimiter,
  validateRequest(resetPasswordSchema),
  resetPassword,
);
router.post("/verify", otpLimiter, validateRequest(verifyEmailSchema), verifyEmail);
router.post(
  "/resend-otp",
  otpLimiter,
  validateRequest(resendVerificationOtpSchema),
  resendVerificationOtp,
);

// NEW: Refresh & Logout
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);
router.get("/oauth/:provider/token", protect, getOAuthProviderToken);
router.get("/me", protect, getCurrentUser);
router.delete("/me", protect, deleteCurrentUser);
router.post("/invites/accept", protect, acceptEnterpriseInvite);
router.post("/enterprise/cancel-premium", protect, cancelEnterprisePremiumAccess);
router.post(
  "/onboarding",
  protect,
  validateRequest(onboardingSchema),
  updateOnboarding,
);

// =============================
// 🔵 GOOGLE OAUTH
// =============================

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const { accessToken, refreshToken } = generateAuthTokens(req.user);
    setRefreshCookie(res, refreshToken);

    // Redirect to Vite with the Access Token in URL
    res.redirect(`${frontendUrl}/login-success?token=${accessToken}`);
  },
);

// =============================
// 🟣 GITHUB OAUTH
// =============================

router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"] }),
);

router.get(
  "/github/callback",
  passport.authenticate("github", { session: false }),
  (req, res) => {
    const { accessToken, refreshToken } = generateAuthTokens(req.user);
    setRefreshCookie(res, refreshToken);

    res.redirect(`${frontendUrl}/login-success?token=${accessToken}`);
  },
);

// =============================
// 🔵 FACEBOOK OAUTH
// =============================

router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] }),
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { session: false }),
  (req, res) => {
    const { accessToken, refreshToken } = generateAuthTokens(req.user);
    setRefreshCookie(res, refreshToken);

    res.redirect(`${frontendUrl}/login-success?token=${accessToken}`);
  },
);

module.exports = router;
