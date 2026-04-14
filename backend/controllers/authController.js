const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/userModel");
const sendVerificationEmail = require("../utils/emailService");
const otpGenerator = require("otp-generator");
const { getValidProviderAccessToken } = require("../utils/oauthTokenService");

const generateAuthTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

const setRefreshCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const normalizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();

// 1. REGISTER USER & SEND OTP
// @desc    Register new user
// @route   POST /api/auth/register
exports.registerUser = async (req, res) => {
  // 1. Get confirmPassword from the request body
  const { name, email, password, confirmPassword, role } = req.body;
  const normalizedEmail = normalizeEmail(email);

  try {
    // 2. BACKEND SAFETY CHECK: Ensure passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    // 3. Check if user already exists
    let user = await User.findOne({ email: normalizedEmail });
    if (user) return res.status(400).json({ message: "User already exists" });

    // 4. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Generate OTP
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // 6. Create User (Notice we do NOT save confirmPassword to the database)
    user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: role || "user",
      otp,
      otpExpires,
    });

    // 7. Send OTP Email
    await sendVerificationEmail(email, otp);

    res.status(201).json({
      message: "User registered. Please check email for OTP.",
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. VERIFY OTP
exports.verifyEmail = async (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = normalizeEmail(email);

  try {
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.isVerified)
      return res.status(400).json({ message: "User already verified" });

    // Check if OTP matches and is not expired
    const receivedOtp = String(otp).trim();
    const storedOtp = String(user.otp).trim();

    console.log("DEBUG OTP Verification:");
    console.log("Received OTP:", receivedOtp, "Type:", typeof receivedOtp);
    console.log("Stored OTP:", storedOtp, "Type:", typeof storedOtp);
    console.log("Match:", storedOtp === receivedOtp);

    if (storedOtp !== receivedOtp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }
    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Verify User
    user.isVerified = true;
    user.otp = undefined; // Clear OTP
    user.otpExpires = undefined;
    await user.save();

    // Issue short-lived access token + long-lived refresh cookie
    const { accessToken, refreshToken } = generateAuthTokens(user);
    setRefreshCookie(res, refreshToken);

    res.status(200).json({
      message: "Email verified successfully",
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. LOGIN (Only if verified)
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  try {
    if (!normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // OAuth-only accounts do not have a local password hash.
    if (!user.password) {
      return res.status(400).json({
        message:
          "This account uses social login. Please continue with Google, GitHub, or Facebook.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isVerified) {
      return res
        .status(401)
        .json({ message: "Account not verified. Please verify your email." });
    }

    const { accessToken, refreshToken } = generateAuthTokens(user);
    setRefreshCookie(res, refreshToken);

    res.json({
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Forgot Password - Send OTP
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log("Received forgot password request for email:", email);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 1. GENERATE 6-DIGIT OTP
    // (Removing the line that caused user.createPasswordResetToken error)
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    // 2. SAVE OTP TO DATABASE
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // Code valid for 10 mins

    // Use validateBeforeSave: false so it doesn't complain about other fields
    await user.save({ validateBeforeSave: false });

    // 3. SEND THE EMAIL
    try {
      // Reusing your existing sendVerificationEmail utility
      await sendVerificationEmail(email, otp);
      res.status(200).json({ message: "Password reset OTP sent to email" });
    } catch (error) {
      // If email fails, clear the OTP data
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: "Error sending email" });
    }
  } catch (error) {
    console.error("Forgot Password Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear OTP fields
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res
      .status(200)
      .json({ message: "Password reset successful. You can now login." });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Refresh Access Token
// @route   POST /api/auth/refresh
exports.refreshAccessToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(401).json({ message: "User not found" });

    // Generate new short-lived Access Token
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    res.json({ token: accessToken });
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

// @desc    Logout User
// @route   POST /api/auth/logout
exports.logoutUser = (req, res) => {
  res.clearCookie("refreshToken");
  res.status(200).json({ message: "Logged out successfully" });
};

// @desc    Get provider access token and auto-refresh if needed
// @route   GET /api/auth/oauth/:provider/token
exports.getOAuthProviderToken = async (req, res) => {
  const provider = String(req.params.provider || "").toLowerCase();
  const forceRefresh =
    String(req.query.forceRefresh || "").toLowerCase() === "true";

  try {
    const result = await getValidProviderAccessToken({
      userId: req.user._id,
      provider,
      forceRefresh,
    });

    res.status(200).json({
      provider: result.provider,
      accessToken: result.accessToken,
      source: result.source,
      expiresAt: result.expiresAt || null,
      updatedAt: result.updatedAt || null,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
