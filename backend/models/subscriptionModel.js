const mongoose = require('mongoose');

/* MongoDB schema definition for subscription documents */
const subscriptionSchema = new mongoose.Schema(
  {
    /* Reference to the user who owns this subscription */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /* Plan type - either Personal or Business */
    plan: {
      type: String,
      enum: ['Personal', 'Business'],
      required: true,
    },

    /* Normalized plan code for internal use */
    planCode: {
      type: String,
      enum: ['pro', 'business'],
      default: null,
    },

    /* Number of seats for Business plan */
    seats: {
      type: Number,
      min: 1,
      default: 1,
    },

    /* Billing cycle frequency */
    billingCycle: {
      type: String,
      enum: ['Monthly'],
      default: 'Monthly',
    },

    /* Subscription amount in the specified currency */
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    /* Currency code for the subscription */
    currency: {
      type: String,
      enum: ['LKR'],
      default: 'LKR',
    },

    /* Current subscription status lifecycle */
    status: {
      type: String,
      enum: ['Pending', 'Active', 'Expired', 'Cancelled'],
      default: 'Pending',
    },

    /* Start date of the subscription period */
    startDate: {
      type: Date,
      required: true,
    },

    /* End date of the subscription period */
    endDate: {
      type: Date,
      required: true,
    },

    /* Payment processor transaction ID. This is pinned to our own order_id
     * for the entire lifecycle of the subscription (set once at checkout
     * initialization, never reassigned) - the return/cancel redirects and
     * confirm-return polling all look the record up by this value, so it
     * must stay stable. PayHere's own payment reference is stored
     * separately in payHerePaymentId below. */
    paymentId: {
      type: String,
    },

    /* PayHere's own payment_id for this transaction, from the notify
     * webhook / Retrieval API - kept purely for reference/support lookups,
     * never used as a query key. */
    payHerePaymentId: {
      type: String,
    },

    /* Unique subscription identifier from payment processor */
    subscriptionId: {
      type: String,
      unique: true,
      sparse: true,
    },

    /* Payment method used */
    method: {
      type: String,
      default: 'PayHere',
    },

    /* PayHere payment status synchronization */
    payHereStatus: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED'],
    },

    /* Last successful charge date */
    lastCharged: {
      type: Date,
    },

    /* Scheduled date for next automatic charge */
    nextChargeDate: {
      type: Date,
    },

    /* Counter for failed payment attempts */
    failureCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

subscriptionSchema.virtual('transactionHistory').get(function () {
  const amount = Number.isFinite(Number(this.amount)) ? Number(this.amount) : 0;
  const statusLabel =
    this.payHereStatus === 'ACTIVE' || this.status === 'Active'
      ? 'Paid'
      : this.status || 'Pending';

  return [
    {
      date: this.lastCharged || this.createdAt || new Date(),
      amount,
      status: statusLabel,
      description: `${this.plan || 'Subscription'} charge`,
    },
  ];
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
