const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const Enrollment = require('../models/enrollmentModel');

const toObjectIdString = (value) => String(value || '').trim();

const buildReminderDateKey = (date = new Date()) => date.toISOString().slice(0, 10);
const buildDailyDedupeKey = (prefix, value, date = new Date()) =>
  `${prefix}:${toObjectIdString(value)}:${date.toISOString().slice(0, 10)}`;

const isOlderThanOneDay = (date) => {
  if (!date) {
    return true;
  }

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return new Date(date).getTime() < oneDayAgo;
};

const createNotification = async ({
  userId,
  type,
  title,
  message,
  category = 'general',
  priority = 'standard',
  link = '',
  metadata = {},
  dedupeKey,
  createdBy = 'system',
}) => {
  const normalizedUserId = toObjectIdString(userId);
  if (!normalizedUserId || !type || !title || !message) {
    return null;
  }

  if (dedupeKey) {
    const existing = await Notification.findOne({ userId: normalizedUserId, dedupeKey });
    if (existing) {
      return existing;
    }
  }

  return Notification.create({
    userId: normalizedUserId,
    type,
    title,
    message,
    category,
    priority,
    link,
    metadata,
    dedupeKey,
    createdBy,
  });
};

const createNotificationsForUsers = async (userIds, payload) => {
  const uniqueUserIds = [...new Set((userIds || []).map(toObjectIdString).filter(Boolean))];
  if (!uniqueUserIds.length) {
    return [];
  }

  return Promise.all(
    uniqueUserIds.map((userId) =>
      createNotification({
        ...payload,
        userId,
        dedupeKey: payload.dedupeKey ? `${payload.dedupeKey}:${userId}` : undefined,
      }),
    ),
  );
};

const getActiveLearnerUserIds = async () => {
  return User.distinct('_id', {
    status: 'active',
  });
};

const notifyNewCourse = async ({ courseId, courseTitle }) => {
  const userIds = await getActiveLearnerUserIds();
  const dedupeKey = buildDailyDedupeKey('course-new', courseId);

  return createNotificationsForUsers(userIds, {
    type: 'course_update',
    category: 'course',
    priority: 'standard',
    title: 'New course available',
    message: `${courseTitle} is now available in your course library.`,
    link: '/dashboard/courses',
    metadata: {
      courseId,
      courseTitle,
    },
    dedupeKey,
  });
};

const notifyCourseUpdate = async ({ courseId, courseTitle, message }) => {
  const enrolledUsers = await Enrollment.distinct('userId', { courseId });
  const dedupeKey = buildDailyDedupeKey('course-update', courseId);

  return createNotificationsForUsers(enrolledUsers, {
    type: 'course_update',
    category: 'course',
    priority: 'standard',
    title: 'Course updated',
    message: message || `${courseTitle} has new updates.`,
    link: `/dashboard/course/${courseId}`,
    metadata: {
      courseId,
      courseTitle,
    },
    dedupeKey,
  });
};

const notifySubscriptionIssue = async ({
  userId,
  title,
  message,
  link = '/subscription',
  type = 'payment_issue',
  dedupeKey,
}) =>
  createNotification({
    userId,
    type,
    category: 'billing',
    priority: 'critical',
    title,
    message,
    link,
    dedupeKey,
  });

const notifyRoleChange = async ({ userId, title, message, link = '/dashboard/settings' }) =>
  createNotification({
    userId,
    type: 'role_change',
    category: 'account',
    priority: 'critical',
    title,
    message,
    link,
  });

const ensureStreakReminder = async (userId) => {
  const user = await User.findById(userId).select('streakCount lastLessonCompletedAt name');
  if (!user || !user.streakCount) {
    return null;
  }

  if (!isOlderThanOneDay(user.lastLessonCompletedAt)) {
    return null;
  }

  const reminderKey = `streak-reminder:${toObjectIdString(userId)}:${buildReminderDateKey()}`;
  return createNotification({
    userId,
    type: 'streak_reminder',
    category: 'streak',
    priority: 'low',
    title: 'Keep your streak alive',
    message: 'Watch a course today to continue your learning streak.',
    link: '/dashboard/courses',
    dedupeKey: reminderKey,
  });
};

const listNotifications = async (userId, limit = 20) => {
  const notifications = await Notification.find({ userId: toObjectIdString(userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const unreadCount = await Notification.countDocuments({
    userId: toObjectIdString(userId),
    readAt: null,
  });

  return {
    notifications,
    unreadCount,
  };
};

const markNotificationRead = async (userId, notificationId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId: toObjectIdString(userId) },
    { $set: { readAt: new Date() } },
    { new: true },
  );
};

const markAllNotificationsRead = async (userId) => {
  return Notification.updateMany(
    { userId: toObjectIdString(userId), readAt: null },
    { $set: { readAt: new Date() } },
  );
};

const clearNotification = async (userId, notificationId) => {
  return Notification.findOneAndDelete({
    _id: notificationId,
    userId: toObjectIdString(userId),
  });
};

const clearAllNotifications = async (userId) => {
  return Notification.deleteMany({ userId: toObjectIdString(userId) });
};

module.exports = {
  createNotification,
  createNotificationsForUsers,
  ensureStreakReminder,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotification,
  clearAllNotifications,
  notifyNewCourse,
  notifyCourseUpdate,
  notifyRoleChange,
  notifySubscriptionIssue,
};