import { beforeEach, describe, expect, it, vi } from "vitest";

const User = require("../../models/userModel");
const Enterprise = require("../../models/enterpriseModel");
const Subscription = require("../../models/subscriptionModel");
const {
  deleteSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  getUserSubscription,
} = require("../../controllers/subscriptionController");

const USER_ID = "507f191e810c19729de860e1";
const SUB_ID_1 = "507f191e810c19729de860e2";
const SUB_ID_2 = "507f191e810c19729de860e3";
const ENT_ID = "507f191e810c19729de860e4";

function makeQueryMock(resolvedValue) {
  const mock = {
    populate: vi.fn(),
    select: vi.fn(),
    sort: vi.fn(),
    limit: vi.fn(),
    lean: vi.fn(),
    then: (resolve) => resolve(resolvedValue),
  };
  mock.populate.mockReturnValue(mock);
  mock.select.mockReturnValue(mock);
  mock.sort.mockReturnValue(mock);
  mock.limit.mockReturnValue(mock);
  mock.lean.mockReturnValue(mock);
  return mock;
}

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("subscriptionController unit tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(Enterprise, "findOne").mockResolvedValue(null);
    vi.spyOn(Enterprise, "findByIdAndDelete").mockResolvedValue(null);
    vi.spyOn(User, "updateMany").mockResolvedValue({ modifiedCount: 0 });
  });

  describe("deleteSubscription", () => {
    it("returns 400 for invalid subscription id", async () => {
      const req = { params: { id: "invalid-id" } };
      const res = mockRes();

      await deleteSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid subscription id" });
    });

    it("returns 404 if subscription does not exist", async () => {
      vi.spyOn(Subscription, "findById").mockResolvedValue(null);

      const req = { params: { id: SUB_ID_1 } };
      const res = mockRes();

      await deleteSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Subscription not found" });
    });

    it("deletes historical (cancelled) subscription without modifying user active subscription", async () => {
      const historicalSub = {
        _id: SUB_ID_1,
        userId: USER_ID,
        status: "Cancelled",
        plan: "Personal",
      };

      const activeSub = {
        _id: SUB_ID_2,
        userId: USER_ID,
        status: "Active",
        plan: "Personal",
      };

      const mockUser = {
        _id: USER_ID,
        role: "(Pro)PlanUser",
        enterpriseId: null,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Subscription, "findById").mockResolvedValue(historicalSub);
      vi.spyOn(Subscription, "findByIdAndDelete").mockResolvedValue(historicalSub);
      vi.spyOn(Subscription, "findOne").mockImplementation(() => makeQueryMock(activeSub));
      vi.spyOn(User, "findById").mockResolvedValue(mockUser);
      const updateManySpy = vi.spyOn(Subscription, "updateMany");

      const req = { params: { id: SUB_ID_1 } };
      const res = mockRes();

      await deleteSubscription(req, res);

      expect(Subscription.findByIdAndDelete).toHaveBeenCalledWith(SUB_ID_1);
      // Subscription.updateMany should NOT be called to cancel active subscriptions
      expect(updateManySpy).not.toHaveBeenCalled();
      expect(mockUser.role).toBe("(Pro)PlanUser");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Subscription deleted successfully. User active subscription retained.",
      });
    });

    it("deletes historical subscription and preserves enterpriseAdmin role if active Business sub exists", async () => {
      const historicalSub = {
        _id: SUB_ID_1,
        userId: USER_ID,
        status: "Cancelled",
        plan: "Business",
      };

      const activeBusinessSub = {
        _id: SUB_ID_2,
        userId: USER_ID,
        status: "Active",
        plan: "Business",
      };

      const mockUser = {
        _id: USER_ID,
        role: "enterpriseAdmin",
        enterpriseId: ENT_ID,
        save: vi.fn().mockResolvedValue(true),
      };

      const mockEnterprise = {
        _id: ENT_ID,
        ownerId: USER_ID,
        members: [{ equals: () => true }],
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Subscription, "findById").mockResolvedValue(historicalSub);
      vi.spyOn(Subscription, "findByIdAndDelete").mockResolvedValue(historicalSub);
      vi.spyOn(Subscription, "findOne").mockImplementation(() => makeQueryMock(activeBusinessSub));
      vi.spyOn(User, "findById").mockResolvedValue(mockUser);
      vi.spyOn(Enterprise, "findOne").mockResolvedValue(mockEnterprise);
      const entDeleteSpy = vi.spyOn(Enterprise, "findByIdAndDelete");

      const req = { params: { id: SUB_ID_1 } };
      const res = mockRes();

      await deleteSubscription(req, res);

      expect(Subscription.findByIdAndDelete).toHaveBeenCalledWith(SUB_ID_1);
      expect(entDeleteSpy).not.toHaveBeenCalled();
      expect(mockUser.role).toBe("enterpriseAdmin");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Subscription deleted successfully. User active subscription retained.",
      });
    });

    it("downgrades non-admin user to Free if no active subscription remains", async () => {
      const activeSub = {
        _id: SUB_ID_1,
        userId: USER_ID,
        status: "Active",
        plan: "Personal",
      };

      const mockUser = {
        _id: USER_ID,
        role: "(Pro)PlanUser",
        enterpriseId: null,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Subscription, "findById").mockResolvedValue(activeSub);
      vi.spyOn(Subscription, "findByIdAndDelete").mockResolvedValue(activeSub);
      // No remaining active subscriptions
      vi.spyOn(Subscription, "findOne").mockImplementation(() => makeQueryMock(null));
      vi.spyOn(User, "findById").mockResolvedValue(mockUser);
      vi.spyOn(Enterprise, "findOne").mockResolvedValue(null);

      const req = { params: { id: SUB_ID_1 } };
      const res = mockRes();

      await deleteSubscription(req, res);

      expect(Subscription.findByIdAndDelete).toHaveBeenCalledWith(SUB_ID_1);
      expect(mockUser.role).toBe("user");
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Subscription deleted. User has no remaining active subscriptions.",
      });
    });

    it("does not downgrade an admin user when their subscription record is deleted", async () => {
      const activeSub = {
        _id: SUB_ID_1,
        userId: USER_ID,
        status: "Active",
        plan: "Personal",
      };

      const mockAdminUser = {
        _id: USER_ID,
        role: "admin",
        enterpriseId: null,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Subscription, "findById").mockResolvedValue(activeSub);
      vi.spyOn(Subscription, "findByIdAndDelete").mockResolvedValue(activeSub);
      vi.spyOn(Subscription, "findOne").mockImplementation(() => makeQueryMock(null));
      vi.spyOn(User, "findById").mockResolvedValue(mockAdminUser);

      const req = { params: { id: SUB_ID_1 } };
      const res = mockRes();

      await deleteSubscription(req, res);

      expect(mockAdminUser.role).toBe("admin");
      expect(mockAdminUser.save).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getAllSubscriptions", () => {
    it("returns all subscriptions with user details", async () => {
      const mockList = [{ _id: SUB_ID_1, plan: "Personal" }];
      vi.spyOn(Subscription, "find").mockImplementation(() => makeQueryMock(mockList));

      const req = {};
      const res = mockRes();

      await getAllSubscriptions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockList);
    });
  });

  describe("getSubscriptionById", () => {
    it("returns 400 for invalid subscription id", async () => {
      const req = { params: { id: "invalid" } };
      const res = mockRes();

      await getSubscriptionById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 if subscription not found", async () => {
      vi.spyOn(Subscription, "findById").mockImplementation(() => makeQueryMock(null));

      const req = { params: { id: SUB_ID_1 } };
      const res = mockRes();

      await getSubscriptionById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns subscription if found", async () => {
      const mockSub = { _id: SUB_ID_1, plan: "Personal" };
      vi.spyOn(Subscription, "findById").mockImplementation(() => makeQueryMock(mockSub));

      const req = { params: { id: SUB_ID_1 } };
      const res = mockRes();

      await getSubscriptionById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSub);
    });
  });

  describe("getUserSubscription", () => {
    it("returns 401 if user is not authenticated", async () => {
      const req = { user: null };
      const res = mockRes();

      await getUserSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns current active subscription", async () => {
      const mockActiveSub = { _id: SUB_ID_1, status: "Active", plan: "Personal" };
      vi.spyOn(Subscription, "findOne").mockImplementation(() => makeQueryMock(mockActiveSub));

      const req = { user: { _id: USER_ID } };
      const res = mockRes();

      await getUserSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockActiveSub);
    });

    it("returns null if no active subscription exists", async () => {
      vi.spyOn(Subscription, "findOne").mockImplementation(() => makeQueryMock(null));

      const req = { user: { _id: USER_ID } };
      const res = mockRes();

      await getUserSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(null);
    });
  });
});
