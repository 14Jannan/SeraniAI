const mongoose = require('mongoose');

/* MongoDB schema definition for enterprise invitation documents */
const enterpriseInviteSchema = new mongoose.Schema(
  {
    /* Reference to the enterprise sending the invitation */
    enterpriseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enterprise',
      required: true,
      index: true,
    },
    /* Reference to the user who sent the invitation */
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /* Email address of the invited user */
    invitedEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    /* Reference to user account if invitation was accepted */
    invitedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    /* Hashed invitation token for secure acceptance */
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    /* Invitation status in its lifecycle */
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'revoked'],
      default: 'pending',
      index: true,
    },
    /* Expiration date for the invitation */
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    /* Timestamp when the invitation was accepted */
    acceptedAt: {
      type: Date,
      default: null,
    },
    /* Timestamp when the invitation was revoked */
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

/* Composite index for efficient querying by email, status, and enterprise */
enterpriseInviteSchema.index({ invitedEmail: 1, status: 1, enterpriseId: 1 });

module.exports = mongoose.model('EnterpriseInvite', enterpriseInviteSchema);
