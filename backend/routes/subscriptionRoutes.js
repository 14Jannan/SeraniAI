const express = require('express');
const router = express.Router();

/* Import subscription controller functions */
const {
  getAllSubscriptions,
  getSubscriptionById,
  createSubscription,
  updateSubscriptionStatus,
  deleteSubscription,
  getUserSubscription,
  syncSubscription,
  retrySubscriptionPayment,
  cancelSubscriptionPayment,
} = require('../controllers/subscriptionController');

/* Import authentication and authorization middleware */
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/* User subscription routes - require authentication */
router.get('/user/current', protect, getUserSubscription);
router.post('/sync', protect, syncSubscription);
router.post('/:id/retry', protect, retrySubscriptionPayment);
router.post('/:id/cancel', protect, cancelSubscriptionPayment);

/* Admin subscription routes - require authentication and admin role */
router.get('/', protect, authorize('admin'), getAllSubscriptions);
router.get('/:id', protect, authorize('admin'), getSubscriptionById);
router.post('/', protect, authorize('admin'), createSubscription);
router.patch('/:id', protect, authorize('admin'), updateSubscriptionStatus);
router.delete('/:id', protect, authorize('admin'), deleteSubscription);

module.exports = router;

