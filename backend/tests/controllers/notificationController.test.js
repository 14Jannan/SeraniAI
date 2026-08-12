import { beforeEach, describe, expect, it, vi } from "vitest";

const Notification = require("../../models/notificationModel");
const User = require("../../models/userModel");
const {
  getNotifications,
  markNotificationAsRead,
  markAllAsRead,
  clearNotification,
  clearAllNotifications,
} = require("../../controllers/notificationController");

const USER_ID = "507f191e810c19729de860e1";
const NOTIF_ID = "507f191e810c19729de860e2";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("notificationController unit tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe("getNotifications", () => {
    it("returns notifications list and unread count", async () => {
      vi.spyOn(User, "findById").mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      });

      const limitMock = vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([{ _id: NOTIF_ID, title: "Test" }]) });
      const sortMock = vi.fn().mockReturnValue({ limit: limitMock });
      vi.spyOn(Notification, "find").mockReturnValue({ sort: sortMock });
      vi.spyOn(Notification, "countDocuments").mockResolvedValue(1);

      const req = { user: { _id: USER_ID } };
      const res = mockRes();

      await getNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        notifications: [{ _id: NOTIF_ID, title: "Test" }],
        unreadCount: 1,
      });
    });
  });

  describe("markNotificationAsRead", () => {
    it("returns 404 if notification is not found", async () => {
      vi.spyOn(Notification, "findOneAndUpdate").mockResolvedValue(null);

      const req = { user: { _id: USER_ID }, params: { id: NOTIF_ID } };
      const res = mockRes();

      await markNotificationAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Notification not found" });
    });

    it("returns 200 with updated notification when found", async () => {
      vi.spyOn(Notification, "findOneAndUpdate").mockResolvedValue({ _id: NOTIF_ID, readAt: new Date() });

      const req = { user: { _id: USER_ID }, params: { id: NOTIF_ID } };
      const res = mockRes();

      await markNotificationAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ notification: expect.objectContaining({ _id: NOTIF_ID }) })
      );
    });
  });

  describe("clearNotification & clearAllNotifications", () => {
    it("clears single notification and returns 200", async () => {
      vi.spyOn(Notification, "findOneAndDelete").mockResolvedValue({ _id: NOTIF_ID });

      const req = { user: { _id: USER_ID }, params: { id: NOTIF_ID } };
      const res = mockRes();

      await clearNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Notification cleared",
        notification: { _id: NOTIF_ID },
      });
    });

    it("clears all notifications and returns 200", async () => {
      vi.spyOn(Notification, "deleteMany").mockResolvedValue({ deletedCount: 5 });

      const req = { user: { _id: USER_ID } };
      const res = mockRes();

      await clearAllNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "All notifications cleared" });
    });
  });
});
