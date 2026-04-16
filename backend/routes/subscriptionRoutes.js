const express = require('express');
const router = express.Router();

const {
  getAllSubscriptions,
  getSubscriptionById,
  createSubscription,
  updateSubscriptionStatus,
  getUserSubscription,
  syncSubscription,
  retrySubscriptionPayment,
  cancelSubscriptionPayment,
} = require('../controllers/subscriptionController');

const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// User routes (protected)
router.get('/user/current', protect, getUserSubscription);
router.post('/sync', protect, syncSubscription);
router.post('/:id/retry', protect, retrySubscriptionPayment);
router.post('/:id/cancel', protect, cancelSubscriptionPayment);

// Admin routes
router.get('/', protect, authorize('admin'), getAllSubscriptions);
router.get('/:id', protect, authorize('admin'), getSubscriptionById);
router.post('/', protect, authorize('admin'), createSubscription);
router.patch('/:id', protect, authorize('admin'), updateSubscriptionStatus);

module.exports = router;

