const Subscription = require('../models/subscriptionModel');
const payHereService = require('../services/payHereService');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Enterprise = require('../models/enterpriseModel');

const normalizePlan = (plan) => {
  if (typeof plan !== 'string') return null;

  const value = plan.toLowerCase();
  if (value.includes('personal')) return 'Personal';
  if (value.includes('business')) return 'Business';
  return null;
};

// GET all subscriptions
exports.getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subscriptions', error });
  }
};

// GET single subscription
exports.getSubscriptionById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid subscription id' });
    }

    const subscription = await Subscription.findById(req.params.id)
      .populate('userId', 'name email');

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.status(200).json(subscription);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subscription', error });
  }
};

// CREATE subscription
exports.createSubscription = async (req, res) => {
  try {
    const { userId, plan, amount, startDate, endDate, billingCycle } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const normalizedPlan = normalizePlan(plan);
    if (!normalizedPlan) {
      return res.status(400).json({
        message: 'Invalid plan. Allowed values: Personal or Business',
      });
    }

    const cycle = billingCycle || 'Monthly';
    if (cycle !== 'Monthly') {
      return res.status(400).json({
        message: 'Invalid billing cycle. Only Monthly is supported',
      });
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (
      Number.isNaN(parsedStartDate.getTime()) ||
      Number.isNaN(parsedEndDate.getTime())
    ) {
      return res.status(400).json({
        message: 'Invalid startDate or endDate',
      });
    }

    if (parsedEndDate <= parsedStartDate) {
      return res.status(400).json({
        message: 'endDate must be after startDate',
      });
    }

    if (typeof amount !== 'number' || amount < 0) {
      return res.status(400).json({
        message: 'Invalid amount',
      });
    }

    const newSubscription = new Subscription({
      userId,
      plan: normalizedPlan,
      billingCycle: cycle,
      amount,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    });

    const saved = await newSubscription.save();

    res.status(201).json(saved);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation failed', error });
    }

    res.status(500).json({ message: 'Error creating subscription', error });
  }
};

// UPDATE subscription status
exports.updateSubscriptionStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid subscription id' });
    }

    const updated = await Subscription.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.status(200).json(updated);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation failed', error });
    }

    res.status(500).json({ message: 'Error updating subscription', error });
  }
};

// DELETE subscription (admin)
exports.deleteSubscription = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid subscription id' });
    }

    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    const userId = subscription.userId;
    const isBusinessPlanDeletion =
      subscription.plan === 'Business' || subscription.planCode === 'business';
    let enterpriseId = null;

    if (userId && isBusinessPlanDeletion) {
      const ownerUser = await User.findById(userId).select('enterpriseId');
      enterpriseId = ownerUser?.enterpriseId || null;
    }

    await Subscription.findByIdAndDelete(req.params.id);

    if (userId) {
      // Ensure the affected user is treated as a free user after deletion.
      await Subscription.updateMany(
        { userId, status: 'Active' },
        { $set: { status: 'Cancelled' } }
      );

      // Keep user profile role in sync with free plan state.
      await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            role: 'user',
            enterpriseId: null,
          },
        },
        { new: true }
      );

      // If a Business owner is downgraded, all enterprise members must also downgrade.
      if (enterpriseId) {
        await User.updateMany(
          { enterpriseId },
          {
            $set: {
              role: 'user',
              enterpriseId: null,
            },
          }
        );

        await Enterprise.findByIdAndDelete(enterpriseId);
      }
    }

    return res.status(200).json({ message: 'Subscription deleted. User downgraded to Free.' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting subscription', error });
  }
};

// GET user subscription
exports.getUserSubscription = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const subscription = await Subscription.findOne({ userId, status: 'Active' })
      .sort({ createdAt: -1 });

    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    res.status(200).json(subscription);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user subscription', error });
  }
};

// SYNC subscription from PayHere
exports.syncSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ message: 'subscriptionId is required' });
    }

    // Fetch from PayHere
    const payHereData = await payHereService.syncSubscription(subscriptionId);

    // Extract customer info
    const customer = payHereData.customer || {};
    const amountDetail = payHereData.amount_detail || {};

    // Update or create subscription in DB
    const updated = await Subscription.findOneAndUpdate(
      { subscriptionId: String(subscriptionId) },
      {
        subscriptionId: String(subscriptionId),
        userId: req.user?._id,
        plan: payHereData.description?.includes('Business') ? 'Business' : 'Personal',
        amount: payHereData.amount,
        currency: payHereData.currency,
        payHereStatus: payHereData.status,
        status: payHereData.status === 'ACTIVE' ? 'Active' : 'Expired',
        paymentId: payHereData.order_id,
        method: 'PayHere',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      message: 'Subscription synced successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Sync error:', error.message);
    res.status(500).json({
      message: 'Error syncing subscription',
      error: error.message,
    });
  }
};

// RETRY failed subscription
exports.retrySubscriptionPayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid subscription id' });
    }

    const subscription = await Subscription.findById(id);

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    if (!subscription.subscriptionId) {
      return res.status(400).json({ message: 'PayHere subscription ID not available' });
    }

    // Call PayHere API to retry
    const result = await payHereService.retrySubscription(
      subscription.subscriptionId
    );

    // Update failure count
    subscription.failureCount = 0;
    await subscription.save();

    res.status(200).json({
      message: result.message,
      data: subscription,
    });
  } catch (error) {
    console.error('Retry error:', error.message);
    res.status(500).json({
      message: 'Error retrying subscription payment',
      error: error.message,
    });
  }
};

// CANCEL subscription
exports.cancelSubscriptionPayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid subscription id' });
    }

    const subscription = await Subscription.findById(id);

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    const requesterId = String(req.user?._id || '');
    const subscriptionOwnerId = String(subscription.userId || '');
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && requesterId !== subscriptionOwnerId) {
      return res.status(403).json({ message: 'Not authorized to cancel this subscription' });
    }

    // Backfill missing PayHere subscription ID for older rows by matching merchant subscriptions.
    if (!subscription.subscriptionId && subscription.paymentId) {
      try {
        const merchantSubscriptions = await payHereService.getSubscriptions();
        const paymentRef = String(subscription.paymentId).trim();

        const matched = merchantSubscriptions.find((item) => {
          const values = [
            item?.order_id,
            item?.orderId,
            item?.reference,
            item?.reference_no,
            item?.payment_id,
            item?.paymentId,
          ]
            .map((value) => String(value || '').trim())
            .filter(Boolean);

          return values.includes(paymentRef);
        });

        const recoveredSubscriptionId = String(matched?.subscription_id || matched?.subscriptionId || '').trim();
        if (recoveredSubscriptionId) {
          subscription.subscriptionId = recoveredSubscriptionId;
          await subscription.save();
        }
      } catch (lookupError) {
        // Lookup errors should not crash the endpoint; we'll return a clear message below if still unresolved.
        console.error('Subscription backfill lookup failed:', lookupError.message);
      }
    }

    if (!subscription.subscriptionId) {
      // Fallback for legacy rows that never stored PayHere subscription IDs.
      // We still honor the user cancellation request locally to stop app access.
      subscription.status = 'Cancelled';
      subscription.payHereStatus = 'CANCELLED';
      await subscription.save();

      const ownerUser = await User.findById(subscription.userId).select('enterpriseId role');
      const enterpriseId = ownerUser?.enterpriseId || null;
      const isBusinessPlan =
        subscription.plan === 'Business' || subscription.planCode === 'business';

      if (ownerUser) {
        ownerUser.role = 'user';
        ownerUser.enterpriseId = null;
        await ownerUser.save();
      }

      if (enterpriseId && isBusinessPlan) {
        await User.updateMany(
          { enterpriseId },
          {
            $set: {
              role: 'user',
              enterpriseId: null,
            },
          }
        );

        await Enterprise.findByIdAndDelete(enterpriseId);
      }

      return res.status(200).json({
        message:
          'Subscription cancelled locally. PayHere subscription ID was not available in this legacy record.',
        data: subscription,
      });
    }

    // Call PayHere API to cancel
    const result = await payHereService.cancelSubscription(
      subscription.subscriptionId
    );

    // Update local record
    subscription.status = 'Cancelled';
    subscription.payHereStatus = 'CANCELLED';
    await subscription.save();

    res.status(200).json({
      message: result.message,
      data: subscription,
    });
  } catch (error) {
    console.error('Cancel error:', error.message);
    res.status(500).json({
      message: 'Error canceling subscription',
      error: error.message,
    });
  }
};
