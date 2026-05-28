const mongoose = require('mongoose');

const enterpriseInviteSchema = new mongoose.Schema(
  {
    enterpriseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enterprise',
      required: true,
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    invitedEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    invitedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'revoked'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

enterpriseInviteSchema.index({ invitedEmail: 1, status: 1, enterpriseId: 1 });

module.exports = mongoose.model('EnterpriseInvite', enterpriseInviteSchema);
