const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/userModel");
const sendVerificationEmail = require("../utils/emailService");
const otpGenerator = require("otp-generator");

// 1. REGISTER USER & SEND OTP
exports.registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 6-digit Numeric OTP
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    // Set Expiry (10 minutes from now)
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Create User
    user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "user",
      otp,
      otpExpires,
      isVerified: false,
    });

    // Send Email
    await sendVerificationEmail(user.email, otp);

    res.status(201).json({
      message: "Registration successful. OTP sent to email.",
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. VERIFY OTP
exports.verifyEmail = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });

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

    // Generate Token immediately so they are logged in
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      },
    );

    res.status(200).json({
      message: "Email verified successfully",
      token,
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

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isVerified) {
      return res
        .status(401)
        .json({ message: "Account not verified. Please verify your email." });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      },
    );

    res.json({
      token,
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
