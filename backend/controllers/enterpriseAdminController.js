const User = require('../models/userModel');
const Enterprise = require('../models/enterpriseModel');
const bcrypt = require('bcryptjs');

// GET ALL USERS IN ENTERPRISE
exports.getEnterpriseUsers = async (req, res) => {
  try {
    const enterpriseId = req.user.enterpriseId;

    if (!enterpriseId) {
      return res.status(400).json({ message: "EnterpriseAdmin is not linked to an enterprise" });
    }

    const users = await User.find({ enterpriseId }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADD USER TO ENTERPRISE (search by email and add existing user)
exports.addUserToEnterprise = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Please provide user email" });
  }

  try {
    const enterpriseId = req.user.enterpriseId;

    if (!enterpriseId) {
      return res.status(400).json({ message: "EnterpriseAdmin is not linked to an enterprise" });
    }

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is already in the enterprise
    if (user.enterpriseId) {
      return res.status(400).json({ message: "User is already in an enterprise" });
    }

    // Add user to enterprise
    user.enterpriseId = enterpriseId;
    user.status = 'active';
    await user.save();

    // Add user to enterprise members array
    await Enterprise.findByIdAndUpdate(
      enterpriseId,
      { $addToSet: { members: user._id } },
      { new: true }
    );

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// UPDATE USER IN ENTERPRISE
exports.updateEnterpriseUser = async (req, res) => {
  try {
    const enterpriseId = req.user.enterpriseId;
    const userId = req.params.id;

    // Check if user belongs to this enterprise
    const user = await User.findById(userId);
    if (!user || user.enterpriseId.toString() !== enterpriseId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Update user fields
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }
    if (req.body.status) user.status = req.body.status;

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      status: updatedUser.status,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// DEACTIVATE USER IN ENTERPRISE
exports.deactivateEnterpriseUser = async (req, res) => {
  try {
    const enterpriseId = req.user.enterpriseId;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user || user.enterpriseId.toString() !== enterpriseId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    user.status = 'deactivated';
    await user.save();

    res.json({ message: "User deactivated", status: user.status });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// DELETE USER FROM ENTERPRISE
exports.deleteEnterpriseUser = async (req, res) => {
  try {
    const enterpriseId = req.user.enterpriseId;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user || user.enterpriseId.toString() !== enterpriseId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Remove user from enterprise
    user.enterpriseId = null;
    user.status = 'active';
    await user.save();

    // Remove from enterprise members
    await Enterprise.findByIdAndUpdate(
      enterpriseId,
      { $pull: { members: userId } },
      { new: true }
    );

    res.json({ message: "User removed from enterprise" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
