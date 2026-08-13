import { createRequire } from "node:module";
import { beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const Subscription = require("../../models/subscriptionModel");
const User = require("../../models/userModel");
const Enterprise = require("../../models/enterpriseModel");
const Notification = require("../../models/notificationModel");
const payHereService = require("../../services/payHereService");
const subscriptionController = require("../../controllers/subscriptionController");

const USER_ID = "507f191e810c19729de860e1";
const SUB_ID = "507f191e810c19729de860e2";
const ENTERPRISE_ID = "507f191e810c19729de860e3";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("subscriptionController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    // notifySubscriptionIssue (called from syncSubscription) ultimately
    // reads/writes through the Notification model - stub those so the real
    // notification logic can run without touching a DB. Its own behavior is
    // covered by tests/notificationService.test.js.
    vi.spyOn(Notification, "findOne").mockResolvedValue(null);
    vi.spyOn(Notification, "create").mockResolvedValue({ _id: "notif1" });
  });

  describe("getAllSubscriptions", () => {
    it("returns all subscriptions sorted by newest first, with user populated", async () => {
      const sortSpy = vi.fn().mockResolvedValue([{ _id: SUB_ID, plan: "Personal" }]);
      const populateSpy = vi.fn().mockReturnValue({ sort: sortSpy });
      vi.spyOn(Subscription, "find").mockReturnValue({ populate: populateSpy });

      const res = mockRes();
      await subscriptionController.getAllSubscriptions({}, res);

      expect(populateSpy).toHaveBeenCalledWith("userId", "name email");
      expect(sortSpy).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ _id: SUB_ID, plan: "Personal" }]);
    });

    it("returns 500 on a database error", async () => {
      vi.spyOn(Subscription, "find").mockImplementation(() => {
        throw new Error("db down");
      });

      const res = mockRes();
      await subscriptionController.getAllSubscriptions({}, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getSubscriptionById", () => {
    it("returns 400 for a malformed id", async () => {
      const res = mockRes();
      await subscriptionController.getSubscriptionById({ params: { id: "not-an-id" } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when not found", async () => {
      vi.spyOn(Subscription, "findById").mockReturnValue({
        populate: vi.fn().mockResolvedValue(null),
      });

      const res = mockRes();
      await subscriptionController.getSubscriptionById({ params: { id: SUB_ID } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns the subscription when found", async () => {
      vi.spyOn(Subscription, "findById").mockReturnValue({
        populate: vi.fn().mockResolvedValue({ _id: SUB_ID, plan: "Business" }),
      });

      const res = mockRes();
      await subscriptionController.getSubscriptionById({ params: { id: SUB_ID } }, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ _id: SUB_ID, plan: "Business" });
    });
  });

  describe("createSubscription", () => {
    const baseBody = {
      userId: USER_ID,
      plan: "Personal",
      amount: 4000,
      startDate: "2026-01-01",
      endDate: "2026-02-01",
      billingCycle: "Monthly",
    };

    it("rejects an invalid userId", async () => {
      const res = mockRes();
      await subscriptionController.createSubscription(
        { body: { ...baseBody, userId: "bad-id" } },
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("rejects an unrecognized plan", async () => {
      const res = mockRes();
      await subscriptionController.createSubscription(
        { body: { ...baseBody, plan: "Enterprise Deluxe" } },
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("Invalid plan") }),
      );
    });

    it("rejects a non-Monthly billing cycle", async () => {
      const res = mockRes();
      await subscriptionController.createSubscription(
        { body: { ...baseBody, billingCycle: "Yearly" } },
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("rejects when endDate is not after startDate", async () => {
      const res = mockRes();
      await subscriptionController.createSubscription(
        { body: { ...baseBody, startDate: "2026-02-01", endDate: "2026-01-01" } },
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("endDate must be after") }),
      );
    });

    it("rejects a negative amount", async () => {
      const res = mockRes();
      await subscriptionController.createSubscription(
        { body: { ...baseBody, amount: -5 } },
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("creates and returns the subscription on valid input", async () => {
      const saved = { _id: SUB_ID, ...baseBody };
      vi.spyOn(Subscription.prototype, "save").mockResolvedValue(saved);

      const res = mockRes();
      await subscriptionController.createSubscription({ body: baseBody }, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(saved);
    });
  });

  describe("updateSubscriptionStatus", () => {
    it("rejects a malformed id", async () => {
      const res = mockRes();
      await subscriptionController.updateSubscriptionStatus(
        { params: { id: "bad-id" }, body: { status: "Cancelled" } },
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when the subscription does not exist", async () => {
      vi.spyOn(Subscription, "findByIdAndUpdate").mockResolvedValue(null);
      const res = mockRes();
      await subscriptionController.updateSubscriptionStatus(
        { params: { id: SUB_ID }, body: { status: "Cancelled" } },
        res,
      );
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("updates status and returns the updated subscription", async () => {
      vi.spyOn(Subscription, "findByIdAndUpdate").mockResolvedValue({
        _id: SUB_ID,
        status: "Expired",
      });
      const res = mockRes();
      await subscriptionController.updateSubscriptionStatus(
        { params: { id: SUB_ID }, body: { status: "Expired" } },
        res,
      );
      expect(Subscription.findByIdAndUpdate).toHaveBeenCalledWith(
        SUB_ID,
        { status: "Expired" },
        { new: true, runValidators: true },
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("deleteSubscription", () => {
    it("rejects a malformed id", async () => {
      const res = mockRes();
      await subscriptionController.deleteSubscription({ params: { id: "bad-id" } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when the subscription does not exist", async () => {
      vi.spyOn(Subscription, "findById").mockResolvedValue(null);
      const res = mockRes();
      await subscriptionController.deleteSubscription({ params: { id: SUB_ID } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("downgrades a personal-plan user to Free without touching any enterprise", async () => {
      vi.spyOn(Subscription, "findById").mockResolvedValue({
        _id: SUB_ID,
        userId: USER_ID,
        plan: "Personal",
      });
      vi.spyOn(Subscription, "findByIdAndDelete").mockResolvedValue({});
      const updateManySpy = vi.spyOn(Subscription, "updateMany").mockResolvedValue({});
      const userUpdateSpy = vi.spyOn(User, "findByIdAndUpdate").mockResolvedValue({});
      const enterpriseDeleteSpy = vi.spyOn(Enterprise, "findByIdAndDelete");

      const res = mockRes();
      await subscriptionController.deleteSubscription({ params: { id: SUB_ID } }, res);

      expect(updateManySpy).toHaveBeenCalledWith(
        { userId: USER_ID, status: "Active" },
        { $set: { status: "Cancelled" } },
      );
      expect(userUpdateSpy).toHaveBeenCalledWith(
        USER_ID,
        { $set: { role: "user", enterpriseId: null } },
        { new: true },
      );
      expect(enterpriseDeleteSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("cascades the downgrade to every enterprise member when a Business plan is deleted", async () => {
      vi.spyOn(Subscription, "findById").mockResolvedValue({
        _id: SUB_ID,
        userId: USER_ID,
        plan: "Business",
      });
      vi.spyOn(User, "findById").mockReturnValue({
        select: vi.fn().mockResolvedValue({ enterpriseId: ENTERPRISE_ID }),
      });
      vi.spyOn(Subscription, "findByIdAndDelete").mockResolvedValue({});
      vi.spyOn(Subscription, "updateMany").mockResolvedValue({});
      vi.spyOn(User, "findByIdAndUpdate").mockResolvedValue({});
      const usersUpdateManySpy = vi.spyOn(User, "updateMany").mockResolvedValue({});
      const enterpriseDeleteSpy = vi
        .spyOn(Enterprise, "findByIdAndDelete")
        .mockResolvedValue({});

      const res = mockRes();
      await subscriptionController.deleteSubscription({ params: { id: SUB_ID } }, res);

      expect(usersUpdateManySpy).toHaveBeenCalledWith(
        { enterpriseId: ENTERPRISE_ID },
        { $set: { role: "user", enterpriseId: null } },
      );
      expect(enterpriseDeleteSpy).toHaveBeenCalledWith(ENTERPRISE_ID);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getUserSubscription", () => {
    it("returns 401 when not authenticated", async () => {
      const res = mockRes();
      await subscriptionController.getUserSubscription({ user: null }, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns null when the user has no active subscription", async () => {
      vi.spyOn(Subscription, "findOne").mockReturnValue({
        sort: vi.fn().mockResolvedValue(null),
      });
      const res = mockRes();
      await subscriptionController.getUserSubscription({ user: { _id: USER_ID } }, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(null);
    });

    it("returns the user's active subscription", async () => {
      vi.spyOn(Subscription, "findOne").mockReturnValue({
        sort: vi.fn().mockResolvedValue({ _id: SUB_ID, status: "Active" }),
      });
      const res = mockRes();
      await subscriptionController.getUserSubscription({ user: { _id: USER_ID } }, res);
      expect(Subscription.findOne).toHaveBeenCalledWith({ userId: USER_ID, status: "Active" });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("syncSubscription", () => {
    it("requires a subscriptionId", async () => {
      const res = mockRes();
      await subscriptionController.syncSubscription({ body: {}, user: { _id: USER_ID } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("syncs an active PayHere subscription and notifies the user", async () => {
      vi.spyOn(payHereService, "syncSubscription").mockResolvedValue({
        description: "Business Monthly Plan",
        amount: 15000,
        currency: "LKR",
        status: "ACTIVE",
        order_id: "SERANI-1",
        customer: {},
        amount_detail: {},
      });
      vi.spyOn(Subscription, "findOneAndUpdate").mockResolvedValue({
        _id: SUB_ID,
        userId: USER_ID,
        status: "Active",
        subscriptionId: "sub_1",
      });

      const res = mockRes();
      await subscriptionController.syncSubscription(
        { body: { subscriptionId: "sub_1" }, user: { _id: USER_ID } },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Subscription synced successfully" }),
      );
      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "payment_success" }),
      );
    });

    it("returns 500 when PayHere lookup fails", async () => {
      vi.spyOn(payHereService, "syncSubscription").mockRejectedValue(
        new Error("Subscription not found on PayHere"),
      );

      const res = mockRes();
      await subscriptionController.syncSubscription(
        { body: { subscriptionId: "missing" }, user: { _id: USER_ID } },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("retrySubscriptionPayment", () => {
    it("rejects a malformed id", async () => {
      const res = mockRes();
      await subscriptionController.retrySubscriptionPayment({ params: { id: "bad-id" } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when not found", async () => {
      vi.spyOn(Subscription, "findById").mockResolvedValue(null);
      const res = mockRes();
      await subscriptionController.retrySubscriptionPayment({ params: { id: SUB_ID } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when there is no PayHere subscription id to retry", async () => {
      vi.spyOn(Subscription, "findById").mockResolvedValue({ _id: SUB_ID, subscriptionId: "" });
      const res = mockRes();
      await subscriptionController.retrySubscriptionPayment({ params: { id: SUB_ID } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("retries via PayHere and resets the failure count", async () => {
      const subscription = {
        _id: SUB_ID,
        subscriptionId: "sub_1",
        failureCount: 3,
        save: vi.fn().mockResolvedValue(),
      };
      vi.spyOn(Subscription, "findById").mockResolvedValue(subscription);
      vi.spyOn(payHereService, "retrySubscription").mockResolvedValue({
        success: true,
        message: "Retry scheduled",
      });

      const res = mockRes();
      await subscriptionController.retrySubscriptionPayment({ params: { id: SUB_ID } }, res);

      expect(subscription.failureCount).toBe(0);
      expect(subscription.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("cancelSubscriptionPayment", () => {
    it("rejects a malformed id", async () => {
      const res = mockRes();
      await subscriptionController.cancelSubscriptionPayment(
        { params: { id: "bad-id" }, user: { _id: USER_ID } },
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when not found", async () => {
      vi.spyOn(Subscription, "findById").mockResolvedValue(null);
      const res = mockRes();
      await subscriptionController.cancelSubscriptionPayment(
        { params: { id: SUB_ID }, user: { _id: USER_ID } },
        res,
      );
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when a non-owner, non-admin user tries to cancel someone else's subscription", async () => {
      vi.spyOn(Subscription, "findById").mockResolvedValue({
        _id: SUB_ID,
        userId: "someone-else",
      });
      const res = mockRes();
      await subscriptionController.cancelSubscriptionPayment(
        { params: { id: SUB_ID }, user: { _id: USER_ID, role: "user" } },
        res,
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("allows an admin to cancel any user's subscription", async () => {
      const subscription = {
        _id: SUB_ID,
        userId: "someone-else",
        subscriptionId: "sub_1",
        save: vi.fn().mockResolvedValue(),
      };
      vi.spyOn(Subscription, "findById").mockResolvedValue(subscription);
      vi.spyOn(payHereService, "cancelSubscription").mockResolvedValue({
        success: true,
        message: "Cancelled",
      });

      const res = mockRes();
      await subscriptionController.cancelSubscriptionPayment(
        { params: { id: SUB_ID }, user: { _id: USER_ID, role: "admin" } },
        res,
      );

      expect(subscription.status).toBe("Cancelled");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("cancels locally for legacy rows with no PayHere subscription id, without calling PayHere", async () => {
      const subscription = {
        _id: SUB_ID,
        userId: USER_ID,
        subscriptionId: "",
        paymentId: "",
        plan: "Personal",
        save: vi.fn().mockResolvedValue(),
      };
      vi.spyOn(Subscription, "findById").mockResolvedValue(subscription);
      vi.spyOn(User, "findById").mockReturnValue({
        select: vi.fn().mockResolvedValue({ enterpriseId: null, role: "(Pro)PlanUser", save: vi.fn() }),
      });
      const cancelSpy = vi.spyOn(payHereService, "cancelSubscription");

      const res = mockRes();
      await subscriptionController.cancelSubscriptionPayment(
        { params: { id: SUB_ID }, user: { _id: USER_ID, role: "user" } },
        res,
      );

      expect(cancelSpy).not.toHaveBeenCalled();
      expect(subscription.status).toBe("Cancelled");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("cancelled locally") }),
      );
    });

    it("cancels via PayHere and marks the subscription Cancelled for a normal row", async () => {
      const subscription = {
        _id: SUB_ID,
        userId: USER_ID,
        subscriptionId: "sub_1",
        save: vi.fn().mockResolvedValue(),
      };
      vi.spyOn(Subscription, "findById").mockResolvedValue(subscription);
      const cancelSpy = vi
        .spyOn(payHereService, "cancelSubscription")
        .mockResolvedValue({ success: true, message: "Cancelled" });

      const res = mockRes();
      await subscriptionController.cancelSubscriptionPayment(
        { params: { id: SUB_ID }, user: { _id: USER_ID, role: "user" } },
        res,
      );

      expect(cancelSpy).toHaveBeenCalledWith("sub_1");
      expect(subscription.status).toBe("Cancelled");
      expect(subscription.payHereStatus).toBe("CANCELLED");
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
