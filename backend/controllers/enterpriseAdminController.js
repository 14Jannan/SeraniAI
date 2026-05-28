const User = require('../models/userModel');
const Enterprise = require('../models/enterpriseModel');
const Subscription = require('../models/subscriptionModel');
const EnterpriseInvite = require('../models/enterpriseInviteModel');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sendVerificationEmail = require('../utils/emailService');

const { sendEnterpriseInviteEmail } = sendVerificationEmail;

const INVITE_EXPIRY_HOURS = 72;

const hashInviteToken = (token) =>
  crypto.createHash('sha256').update(String(token)).digest('hex');

const getSeatSummary = async ({ enterpriseId, ownerId }) => {
  const enterprise = await Enterprise.findById(enterpriseId).select('ownerId');
  if (!enterprise) {
    return {
      seatLimit: 1,
      seatsUsed: 0,
      seatsRemaining: 1,
    };
  }

  const activeBusinessSubscription = await Subscription.findOne({
    userId: ownerId,
    status: 'Active',
    plan: 'Business',
  }).sort({ createdAt: -1 });

  const seatLimit = Math.max(1, Number(activeBusinessSubscription?.seats || 1));
  // Count seats from users currently linked to the enterprise.
  // This avoids inflated seat usage caused by stale member IDs in old enterprise history.
  const linkedUsers = await User.find({ enterpriseId }).select('_id');
  const seatsUsed = linkedUsers.length;

  return {
    seatLimit,
    seatsUsed,
    seatsRemaining: Math.max(0, seatLimit - seatsUsed),
  };
};

// GET ALL USERS IN ENTERPRISE
exports.getEnterpriseUsers = async (req, res) => {
  try {
    const enterpriseId = req.user.enterpriseId;

    if (!enterpriseId) {
      return res.status(400).json({ message: "EnterpriseAdmin is not linked to an enterprise" });
    }

    const enterprise = await Enterprise.findById(enterpriseId).select('ownerId');
    const users = await User.find({ enterpriseId }).select('-password');

    await EnterpriseInvite.updateMany(
      {
        enterpriseId,
        status: 'pending',
        expiresAt: { $lte: new Date() },
      },
      {
        $set: { status: 'expired' },
      }
    );

    const invites = await EnterpriseInvite.find({ enterpriseId })
      .sort({ createdAt: -1 })
      .select('invitedEmail status createdAt expiresAt acceptedAt invitedUserId');

    const acceptedInviteUserIds = invites
      .filter(
        (invite) =>
          invite.status === 'accepted' && invite.invitedUserId
      )
      .map((invite) => invite.invitedUserId);

    const activeEnterpriseUsers = acceptedInviteUserIds.length
      ? await User.find({
          _id: { $in: acceptedInviteUserIds },
          enterpriseId,
        }).select('_id')
      : [];

    const activeEnterpriseUserIdSet = new Set(
      activeEnterpriseUsers.map((user) => String(user._id))
    );

    const visibleInvites = invites.filter((invite) => {
      if (invite.status !== 'accepted') {
        return true;
      }

      if (!invite.invitedUserId) {
        return false;
      }

      return activeEnterpriseUserIdSet.has(String(invite.invitedUserId));
    });

    const seatSummary = await getSeatSummary({
      enterpriseId,
      ownerId: req.user._id,
    });

    res.json({
      users: users.map((user) => ({
        ...user.toObject(),
        isOwner: String(user._id) === String(enterprise?.ownerId || ''),
      })),
      invites: visibleInvites.map((invite) => ({
        id: invite._id,
        email: invite.invitedEmail,
        status: invite.status,
        invitedAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        acceptedAt: invite.acceptedAt,
      })),
      ...seatSummary,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADD USER TO ENTERPRISE (search by email and add existing user)
exports.addUserToEnterprise = async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    return res.status(400).json({ message: "Please provide user email" });
  }

  try {
    const enterpriseId = req.user.enterpriseId;

    if (!enterpriseId) {
      return res.status(400).json({ message: "EnterpriseAdmin is not linked to an enterprise" });
    }

    const seatSummary = await getSeatSummary({
      enterpriseId,
      ownerId: req.user._id,
    });

    if (seatSummary.seatsUsed >= seatSummary.seatLimit) {
      return res.status(400).json({
        message: `Seat limit reached. You have used ${seatSummary.seatsUsed} of ${seatSummary.seatLimit} seats.`
      });
    }

    const enterprise = await Enterprise.findById(enterpriseId).select('name ownerId');
    if (!enterprise) {
      return res.status(404).json({ message: 'Enterprise not found' });
    }

    // Find the user by email (invites are limited to existing users in this version)
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found. Ask the user to register first." });
    }

    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You are already the enterprise owner' });
    }

    // Check if user is already in an enterprise
    if (user.enterpriseId && String(user.enterpriseId) === String(enterpriseId)) {
      return res.status(400).json({ message: 'User is already in this enterprise' });
    }

    if (user.enterpriseId && String(user.enterpriseId) !== String(enterpriseId)) {
      return res.status(400).json({ message: "User is already in an enterprise" });
    }

    const existingPendingInvite = await EnterpriseInvite.findOne({
      enterpriseId,
      invitedEmail: normalizedEmail,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (existingPendingInvite) {
      return res.status(400).json({ message: 'A pending invite already exists for this user.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashInviteToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

    const invite = await EnterpriseInvite.create({
      enterpriseId,
      invitedBy: req.user._id,
      invitedEmail: normalizedEmail,
      invitedUserId: user._id,
      tokenHash,
      status: 'pending',
      expiresAt,
    });

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${frontendBase}/enterprise/invite/accept?token=${rawToken}`;

    try {
      await sendEnterpriseInviteEmail({
        toEmail: normalizedEmail,
        inviterName: req.user.name || 'Enterprise Admin',
        enterpriseName: enterprise.name || 'Enterprise Workspace',
        inviteUrl,
        expiresAt,
      });
    } catch (emailError) {
      invite.status = 'revoked';
      invite.revokedAt = new Date();
      await invite.save();
      return res.status(500).json({ message: 'Failed to send invite email. Please try again.' });
    }

    res.status(201).json({
      message: 'Invitation sent successfully',
      invite: {
        id: invite._id,
        email: normalizedEmail,
        expiresAt: invite.expiresAt,
        status: invite.status,
      },
      seatSummary: {
        seatLimit: seatSummary.seatLimit,
        seatsUsed: seatSummary.seatsUsed,
        seatsRemaining: Math.max(0, seatSummary.seatLimit - seatSummary.seatsUsed),
      },
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

    const enterprise = await Enterprise.findById(enterpriseId).select('ownerId');
    if (!enterprise) {
      return res.status(404).json({ message: 'Enterprise not found' });
    }

    if (String(userId) === String(enterprise.ownerId)) {
      return res.status(400).json({ message: 'Enterprise owner cannot be removed' });
    }

    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot remove your own account' });
    }

    const user = await User.findById(userId);
    if (!user || !user.enterpriseId || String(user.enterpriseId) !== String(enterpriseId)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Remove user from enterprise
    user.enterpriseId = null;
    if (user.role === 'enterpriseUser') {
      user.role = 'user';
    }
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

// REVOKE PENDING INVITE
exports.revokeEnterpriseInvite = async (req, res) => {
  try {
    const enterpriseId = req.user.enterpriseId;
    const inviteId = req.params.id;

    if (!enterpriseId) {
      return res
        .status(400)
        .json({ message: "EnterpriseAdmin is not linked to an enterprise" });
    }

    const invite = await EnterpriseInvite.findById(inviteId);
    if (!invite || String(invite.enterpriseId) !== String(enterpriseId)) {
      return res.status(404).json({ message: "Invite not found" });
    }

    if (invite.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending invites can be stopped" });
    }

    invite.status = "revoked";
    invite.revokedAt = new Date();
    await invite.save();

    return res.status(200).json({ message: "Invite stopped successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server Error" });
  }
};
