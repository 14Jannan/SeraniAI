import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNotificationModel = {
  findOneAndDelete: vi.fn(),
  deleteMany: vi.fn(),
};

vi.mock('../models/notificationModel', () => mockNotificationModel);

vi.mock('../models/userModel', () => ({
  default: {},
}));

vi.mock('../models/enrollmentModel', () => ({
  default: {},
}));

const Notification = require('../models/notificationModel');
const { clearAllNotifications, clearNotification } = require('../services/notificationService');

describe('notificationService clear helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears a single notification for the matching user', async () => {
    const notification = { _id: 'notif-1', userId: 'user-1' };
    Notification.findOneAndDelete.mockResolvedValue(notification);

    const result = await clearNotification('user-1', 'notif-1');

    expect(Notification.findOneAndDelete).toHaveBeenCalledWith({
      _id: 'notif-1',
      userId: 'user-1',
    });
    expect(result).toEqual(notification);
  });

  it('clears all notifications for the matching user', async () => {
    Notification.deleteMany.mockResolvedValue({ deletedCount: 2 });

    const result = await clearAllNotifications('user-1');

    expect(Notification.deleteMany).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(result.deletedCount).toBe(2);
  });
});
