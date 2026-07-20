const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const {
  getNotifications,
  markAllAsRead,
  markNotificationAsRead,
  clearNotification,
  clearAllNotifications,
} = require('../controllers/notificationController');

router.use(protect);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/clear', clearNotification);
router.patch('/clear-all', clearAllNotifications);
router.patch('/:id/read', markNotificationAsRead);

module.exports = router;