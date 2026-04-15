const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");
const { protect } = require("../middleware/authMiddleware");

// Import your existing controllers
const {
  registerUser,
  loginUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  refreshAccessToken, // You will add this to authController
  logoutUser, // You will add this to authController
  getOAuthProviderToken,
} = require("../controllers/authController");

// =============================
// 🔐 JWT GENERATORS
// =============================

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }, // Access token is short-lived
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }, // Refresh token is long-lived
  );

  return { accessToken, refreshToken };
};

// Helper to set the cookie
const setRefreshCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: "Lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// =============================
// 🔐 LOCAL AUTH ROUTES
// =============================

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify", verifyEmail);

// NEW: Refresh & Logout
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);
router.get("/oauth/:provider/token", protect, getOAuthProviderToken);

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
    const { accessToken, refreshToken } = generateTokens(req.user);
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
    const { accessToken, refreshToken } = generateTokens(req.user);
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
    const { accessToken, refreshToken } = generateTokens(req.user);
    setRefreshCookie(res, refreshToken);

    res.redirect(`${frontendUrl}/login-success?token=${accessToken}`);
  },
);

module.exports = router;
