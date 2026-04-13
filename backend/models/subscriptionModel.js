const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    plan: {
      type: String,
      enum: ['Personal', 'Business'],
      required: true,
    },

    billingCycle: {
      type: String,
      enum: ['Monthly'],
      default: 'Monthly',
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      enum: ['LKR'],
      default: 'LKR',
    },

    status: {
      type: String,
      enum: ['Pending', 'Active', 'Expired', 'Cancelled'],
      default: 'Pending',
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    paymentId: {
      type: String,
    },

    subscriptionId: {
      type: String,
      unique: true,
      sparse: true,
    },

    method: {
      type: String,
      default: 'PayHere',
    },

    payHereStatus: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'FAILED'],
    },

    lastCharged: {
      type: Date,
    },

    nextChargeDate: {
      type: Date,
    },

    failureCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
