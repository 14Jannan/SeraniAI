import { beforeEach, describe, expect, it, vi } from "vitest";

const Notification = require("../models/notificationModel");
const User = require("../models/userModel");
const Enrollment = require("../models/enrollmentModel");

const {
  createNotification,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotification,
  clearAllNotifications,
  notifyNewCourse,
  notifyRoleChange,
} = require("../services/notificationService");

const VALID_ID_1 = "507f191e810c19729de860e1";
const VALID_ID_2 = "507f191e810c19729de860e2";
const NOTIF_ID_1 = "507f191e810c19729de860e3";

describe("notificationService unit tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe("createNotification", () => {
    it("returns null if required fields are missing", async () => {
      const res = await createNotification({ userId: "", type: "test", title: "t", message: "m" });
      expect(res).toBeNull();
    });

    it("creates a notification successfully when valid payload is passed", async () => {
      vi.spyOn(Notification, "create").mockResolvedValue({ _id: NOTIF_ID_1, userId: VALID_ID_1, title: "Hello" });
      const result = await createNotification({
        userId: VALID_ID_1,
        type: "system",
        title: "Hello",
        message: "Welcome user",
      });

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: VALID_ID_1,
          type: "system",
          title: "Hello",
          message: "Welcome user",
        })
      );
      expect(result).toEqual({ _id: NOTIF_ID_1, userId: VALID_ID_1, title: "Hello" });
    });

    it("returns existing notification if dedupeKey already exists", async () => {
      vi.spyOn(Notification, "findOne").mockResolvedValue({ _id: NOTIF_ID_1, dedupeKey: "key-1" });
      const result = await createNotification({
        userId: VALID_ID_1,
        type: "system",
        title: "Hello",
        message: "Welcome",
        dedupeKey: "key-1",
      });

      expect(Notification.findOne).toHaveBeenCalledWith({ userId: VALID_ID_1, dedupeKey: "key-1" });
      expect(result._id).toBe(NOTIF_ID_1);
    });
  });

  describe("listNotifications", () => {
    it("returns user notifications and unread count", async () => {
      const limitMock = vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([{ _id: NOTIF_ID_1 }]) });
      const sortMock = vi.fn().mockReturnValue({ limit: limitMock });
      vi.spyOn(Notification, "find").mockReturnValue({ sort: sortMock });
      vi.spyOn(Notification, "countDocuments").mockResolvedValue(1);

      const result = await listNotifications(VALID_ID_1, 10);

      expect(Notification.find).toHaveBeenCalledWith({ userId: VALID_ID_1 });
      expect(Notification.countDocuments).toHaveBeenCalledWith({ userId: VALID_ID_1, readAt: null });
      expect(result.notifications).toEqual([{ _id: NOTIF_ID_1 }]);
      expect(result.unreadCount).toBe(1);
    });
  });

  describe("markNotificationRead & markAllNotificationsRead", () => {
    it("marks a single notification as read", async () => {
      vi.spyOn(Notification, "findOneAndUpdate").mockResolvedValue({ _id: NOTIF_ID_1, readAt: new Date() });
      const res = await markNotificationRead(VALID_ID_1, NOTIF_ID_1);
      expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: NOTIF_ID_1, userId: VALID_ID_1 },
        expect.objectContaining({ $set: expect.objectContaining({ readAt: expect.any(Date) }) }),
        { new: true }
      );
      expect(res._id).toBe(NOTIF_ID_1);
    });

    it("marks all notifications as read for a user", async () => {
      vi.spyOn(Notification, "updateMany").mockResolvedValue({ modifiedCount: 3 });
      const res = await markAllNotificationsRead(VALID_ID_1);
      expect(Notification.updateMany).toHaveBeenCalledWith(
        { userId: VALID_ID_1, readAt: null },
        expect.objectContaining({ $set: expect.objectContaining({ readAt: expect.any(Date) }) })
      );
      expect(res.modifiedCount).toBe(3);
    });
  });

  describe("clearNotification & clearAllNotifications", () => {
    it("clears a single notification for the matching user", async () => {
      const notification = { _id: NOTIF_ID_1, userId: VALID_ID_1 };
      vi.spyOn(Notification, "findOneAndDelete").mockResolvedValue(notification);

      const result = await clearNotification(VALID_ID_1, NOTIF_ID_1);

      expect(Notification.findOneAndDelete).toHaveBeenCalledWith({
        _id: NOTIF_ID_1,
        userId: VALID_ID_1,
      });
      expect(result).toEqual(notification);
    });

    it("clears all notifications for the matching user", async () => {
      vi.spyOn(Notification, "deleteMany").mockResolvedValue({ deletedCount: 2 });

      const result = await clearAllNotifications(VALID_ID_1);

      expect(Notification.deleteMany).toHaveBeenCalledWith({ userId: VALID_ID_1 });
      expect(result.deletedCount).toBe(2);
    });
  });

  describe("helper notifiers", () => {
    it("notifyNewCourse sends notifications to active learners", async () => {
      vi.spyOn(User, "distinct").mockResolvedValue([VALID_ID_1, VALID_ID_2]);
      vi.spyOn(Notification, "findOne").mockResolvedValue(null);
      vi.spyOn(Notification, "create").mockImplementation((payload) => Promise.resolve({ ...payload, _id: NOTIF_ID_1 }));

      await notifyNewCourse({ courseId: VALID_ID_1, courseTitle: "JS 101" });

      expect(User.distinct).toHaveBeenCalledWith("_id", { status: "active" });
      expect(Notification.create).toHaveBeenCalledTimes(2);
    });

    it("notifyRoleChange creates a critical role change notification", async () => {
      vi.spyOn(Notification, "findOne").mockResolvedValue(null);
      vi.spyOn(Notification, "create").mockResolvedValue({ _id: NOTIF_ID_1 });
      await notifyRoleChange({ userId: VALID_ID_1, title: "Role Updated", message: "You are admin now" });

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: VALID_ID_1,
          type: "role_change",
          category: "account",
          priority: "critical",
        })
      );
    });
  });
});
