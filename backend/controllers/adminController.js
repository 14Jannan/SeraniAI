const User = require("../models/userModel");
const bcrypt = require("bcryptjs");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const normalizeEmail = (email) => String(email || "").trim();

// GET ALL USERS
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// CREATE USER
exports.createUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  const normalizedRole = role === "enterprise" ? "enterpriseUser" : role;
  const normalizedEmail = normalizeEmail(email);

  if (!name || !normalizedEmail || !password || !role) {
    return res.status(400).json({ message: "Please provide all fields" });
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res
      .status(400)
      .json({ message: "Please provide a valid email address" });
  }

  if (String(password).length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  try {
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      isVerified: true,
    });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server Error" });
  }
};

// UPDATE USER
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.body.name !== undefined) {
      const trimmedName = String(req.body.name).trim();
      if (!trimmedName) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      user.name = trimmedName;
    }

    if (req.body.email !== undefined) {
      const normalizedEmail = normalizeEmail(req.body.email);

      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res
          .status(400)
          .json({ message: "Please provide a valid email address" });
      }

      const existing = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
      });

      if (existing) {
        return res.status(400).json({ message: "Email already in use" });
      }

      user.email = normalizedEmail;
    }

    if (req.body.role !== undefined) {
      user.role =
        req.body.role === "enterprise"
          ? "enterpriseUser"
          : req.body.role || user.role;
    }

    if (
      req.body.password !== undefined &&
      String(req.body.password).length > 0
    ) {
      if (String(req.body.password).length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    const updatedUser = await user.save();

    return res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server Error" });
  }
};

// DELETE USER
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      await user.deleteOne();
      return res.json({ message: "User removed" });
    }

    return res.status(404).json({ message: "User not found" });
  } catch (error) {
    return res.status(500).json({ message: "Server Error" });
  }
};
