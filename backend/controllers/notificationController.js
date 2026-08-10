const {
  ensureStreakReminder,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  clearNotification,
  clearAllNotifications,
} = require('../services/notificationService');

exports.getNotifications = async (req, res) => {
  try {
    await ensureStreakReminder(req.user._id);

    const { notifications, unreadCount } = await listNotifications(req.user._id, 20);
    return res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  try {
    const notification = await markNotificationRead(req.user._id, req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.status(200).json({ notification });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await markAllNotificationsRead(req.user._id);
    return res.status(200).json({ message: 'Notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating notifications', error: error.message });
  }
};