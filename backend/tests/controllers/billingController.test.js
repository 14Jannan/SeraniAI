import { createRequire } from "node:module";
import crypto from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const Subscription = require("../../models/subscriptionModel");
const User = require("../../models/userModel");
const Enterprise = require("../../models/enterpriseModel");
const payHereService = require("../../services/payHereService");
const {
  initializePayHerePayment,
  handlePayHereNotify,
  handlePayHereReturnRedirect,
  handlePayHereCancelRedirect,
  confirmPayHereReturn,
  verifySubscriptionAgainstPayHere,
} = require("../../controllers/billingController");

const md5Upper = (value) =>
  crypto.createHash("md5").update(String(value)).digest("hex").toUpperCase();

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.redirect = vi.fn().mockReturnValue(res);
  res.set = vi.fn().mockReturnValue(res);
  return res;
};

describe("billingController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    process.env.PAYHERE_MERCHANT_ID = "1234615";
    process.env.PAYHERE_MERCHANT_SECRET = "test-merchant-secret";
    process.env.PAYHERE_SECRET_FORMAT = "plain";
    process.env.PAYHERE_ENV = "sandbox";
    process.env.FRONTEND_URL = "https://app.seraniai.com";
    process.env.BACKEND_URL = "https://api.seraniai.com";

    // Default every test to "PayHere has no record of this payment yet" so
    // confirmPayHereReturn/verifySubscriptionAgainstPayHere tests never
    // make a real network call by accident - tests that care about a
    // specific PayHere response override this explicitly.
    vi.spyOn(payHereService, "getPaymentByOrderId").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initializePayHerePayment", () => {
    it("rejects enterprise users from starting a new checkout", async () => {
      const req = {
        body: { planId: "pro" },
        user: { _id: "u1", role: "enterpriseUser" },
      };
      const res = mockRes();

      await initializePayHerePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("rejects a second checkout while an active subscription exists", async () => {
      vi.spyOn(Subscription, "findOne").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ _id: "sub1", status: "Active" }),
        }),
      });

      const req = {
        body: { planId: "pro" },
        user: { _id: "u1", role: "user" },
      };
      const res = mockRes();

      await initializePayHerePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("rejects an unknown plan id", async () => {
      vi.spyOn(Subscription, "findOne").mockReturnValue({
        sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      });

      const req = {
        body: { planId: "unknown-plan" },
        user: { _id: "u1", role: "user" },
      };
      const res = mockRes();

      await initializePayHerePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("creates a pending subscription and returns a signed PayHere payload for a valid pro plan request", async () => {
      vi.spyOn(Subscription, "findOne").mockReturnValue({
        sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      });
      const upsertSpy = vi
        .spyOn(Subscription, "findOneAndUpdate")
        .mockResolvedValue({ _id: "sub1" });

      const req = {
        body: { planId: "pro" },
        user: { _id: "u1", role: "user", name: "Alice", email: "alice@test.com" },
        protocol: "https",
        get: () => "api.seraniai.com",
      };
      const res = mockRes();

      await initializePayHerePayment(req, res);

      expect(upsertSpy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      const [payload] = res.json.mock.calls[0];
      expect(payload.payload.amount).toBe("4000.00");
      expect(payload.payload.merchant_id).toBe("1234615");
      expect(payload.payload.hash).toHaveLength(32);
    });
  });

  describe("handlePayHereReturnRedirect", () => {
    it("does NOT activate the subscription - it only redirects the browser back", async () => {
      const subscription = {
        _id: "sub1",
        status: "Pending",
        paymentId: "SERANI-123",
        returnUrl: "https://app.seraniai.com/subscription?payment=success",
        save: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(Subscription, "findOne").mockResolvedValue(subscription);

      const req = { query: { order_id: "SERANI-123" } };
      const res = mockRes();

      await handlePayHereReturnRedirect(req, res);

      // Regression guard for the security fix: this public, unauthenticated
      // GET endpoint must never be the thing that flips a subscription to
      // Active - only the signature-verified notify webhook may do that.
      expect(subscription.save).not.toHaveBeenCalled();
      expect(subscription.status).toBe("Pending");
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("payment=success"),
      );
    });

    it("returns 404 when the order does not exist", async () => {
      vi.spyOn(Subscription, "findOne").mockResolvedValue(null);
      const req = { query: { order_id: "missing" } };
      const res = mockRes();

      await handlePayHereReturnRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when order_id is missing", async () => {
      const req = { query: {} };
      const res = mockRes();

      await handlePayHereReturnRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("handlePayHereCancelRedirect", () => {
    it("redirects to the cancel url without touching the subscription", async () => {
      const subscription = {
        cancelUrl: "https://app.seraniai.com/subscription?payment=cancelled",
      };
      vi.spyOn(Subscription, "findOne").mockResolvedValue(subscription);
      const req = { query: { order_id: "SERANI-123" } };
      const res = mockRes();

      await handlePayHereCancelRedirect(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("payment=cancelled"),
      );
    });
  });

  describe("confirmPayHereReturn", () => {
    it("returns 401 when not authenticated", async () => {
      const req = { user: null, body: { orderId: "SERANI-1" } };
      const res = mockRes();

      await confirmPayHereReturn(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 404 when the order does not belong to the user", async () => {
      vi.spyOn(Subscription, "findOne").mockResolvedValue(null);
      const req = { user: { _id: "u1" }, body: { orderId: "SERANI-1" } };
      const res = mockRes();

      await confirmPayHereReturn(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 200 immediately when the notify webhook already activated it", async () => {
      vi.spyOn(Subscription, "findOne").mockResolvedValue({
        status: "Active",
        paymentId: "SERANI-1",
        userId: "u1",
      });
      vi.spyOn(User, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: "u1", role: "(Pro)PlanUser" }),
      });

      const req = { user: { _id: "u1" }, body: { orderId: "SERANI-1" } };
      const res = mockRes();

      await confirmPayHereReturn(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Subscription payment confirmed" }),
      );
    });

    it("does NOT activate the subscription itself and reports 202 pending if notify never lands", async () => {
      vi.useFakeTimers();
      vi.spyOn(Subscription, "findOne").mockResolvedValue({
        status: "Pending",
        paymentId: "SERANI-1",
        userId: "u1",
      });

      const req = { user: { _id: "u1" }, body: { orderId: "SERANI-1" } };
      const res = mockRes();

      const promise = confirmPayHereReturn(req, res);
      await vi.runAllTimersAsync();
      await promise;

      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ pending: true }),
      );
    });

    it("picks up activation once the notify webhook lands mid-poll", async () => {
      vi.useFakeTimers();
      vi.spyOn(Subscription, "findOne")
        .mockResolvedValueOnce({ status: "Pending", paymentId: "SERANI-1", userId: "u1" })
        .mockResolvedValueOnce({ status: "Pending", paymentId: "SERANI-1", userId: "u1" })
        .mockResolvedValue({ status: "Active", paymentId: "SERANI-1", userId: "u1" });
      vi.spyOn(User, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: "u1", role: "(Pro)PlanUser" }),
      });

      const req = { user: { _id: "u1" }, body: { orderId: "SERANI-1" } };
      const res = mockRes();

      const promise = confirmPayHereReturn(req, res);
      await vi.runAllTimersAsync();
      await promise;

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("activates via PayHere's Retrieval API when the notify webhook never lands (e.g. no public notify URL in local dev)", async () => {
      vi.useFakeTimers();
      const subscriptionDoc = {
        status: "Pending",
        paymentId: "SERANI-1",
        userId: "u1",
        plan: "Personal",
        planCode: "pro",
        amount: 4000,
        currency: "LKR",
        save: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(Subscription, "findOne").mockResolvedValue(subscriptionDoc);
      vi.spyOn(payHereService, "getPaymentByOrderId").mockResolvedValue([
        { payment_id: 999, order_id: "SERANI-1", status: "RECEIVED", currency: "LKR", amount: 4000 },
      ]);
      // User.findById is called twice in this flow with different chains:
      // once directly (inside syncUserRoleFromPlanCode, which mutates and
      // calls .save()) and once with .lean() (the final response fetch in
      // confirmPayHereReturn) - this one object supports both.
      const userDoc = {
        _id: "u1",
        role: "user",
        enterpriseId: null,
        save: vi.fn().mockResolvedValue(undefined),
        lean: vi.fn().mockResolvedValue({ _id: "u1", role: "(Pro)PlanUser" }),
      };
      vi.spyOn(User, "findById").mockReturnValue(userDoc);

      const req = { user: { _id: "u1" }, body: { orderId: "SERANI-1" } };
      const res = mockRes();

      const promise = confirmPayHereReturn(req, res);
      await vi.runAllTimersAsync();
      await promise;

      expect(subscriptionDoc.save).toHaveBeenCalled();
      expect(subscriptionDoc.status).toBe("Active");
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("verifySubscriptionAgainstPayHere", () => {
    const makeSubscription = (overrides = {}) => ({
      status: "Pending",
      paymentId: "SERANI-1",
      userId: "u1",
      plan: "Personal",
      planCode: "pro",
      amount: 4000,
      currency: "LKR",
      save: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    });

    it("returns the subscription unchanged (no PayHere call) when it's already Active", async () => {
      const subscription = makeSubscription({ status: "Active" });
      const spy = vi.spyOn(payHereService, "getPaymentByOrderId");

      const result = await verifySubscriptionAgainstPayHere(subscription);

      expect(spy).not.toHaveBeenCalled();
      expect(result.status).toBe("Active");
    });

    it("leaves it Pending when PayHere has no record of the payment yet", async () => {
      const subscription = makeSubscription();
      vi.spyOn(payHereService, "getPaymentByOrderId").mockResolvedValue([]);

      const result = await verifySubscriptionAgainstPayHere(subscription);

      expect(result.status).toBe("Pending");
      expect(subscription.save).not.toHaveBeenCalled();
    });

    it("leaves it Pending when PayHere reports a non-RECEIVED status (e.g. still processing)", async () => {
      const subscription = makeSubscription();
      vi.spyOn(payHereService, "getPaymentByOrderId").mockResolvedValue([
        { payment_id: 1, order_id: "SERANI-1", status: "PENDING", currency: "LKR", amount: 4000 },
      ]);

      const result = await verifySubscriptionAgainstPayHere(subscription);

      expect(result.status).toBe("Pending");
      expect(subscription.save).not.toHaveBeenCalled();
    });

    it("SECURITY: does not activate on a RECEIVED payment whose amount doesn't match the order", async () => {
      const subscription = makeSubscription({ amount: 4000 });
      vi.spyOn(payHereService, "getPaymentByOrderId").mockResolvedValue([
        { payment_id: 1, order_id: "SERANI-1", status: "RECEIVED", currency: "LKR", amount: 1 },
      ]);

      const result = await verifySubscriptionAgainstPayHere(subscription);

      expect(result.status).toBe("Pending");
      expect(subscription.save).not.toHaveBeenCalled();
    });

    it("SECURITY: does not activate on a RECEIVED payment in the wrong currency", async () => {
      const subscription = makeSubscription({ amount: 4000, currency: "LKR" });
      vi.spyOn(payHereService, "getPaymentByOrderId").mockResolvedValue([
        { payment_id: 1, order_id: "SERANI-1", status: "RECEIVED", currency: "USD", amount: 4000 },
      ]);

      const result = await verifySubscriptionAgainstPayHere(subscription);

      expect(result.status).toBe("Pending");
      expect(subscription.save).not.toHaveBeenCalled();
    });

    it("activates and syncs the user's role on a matching RECEIVED payment", async () => {
      const subscription = makeSubscription();
      vi.spyOn(payHereService, "getPaymentByOrderId").mockResolvedValue([
        { payment_id: 555, order_id: "SERANI-1", status: "RECEIVED", currency: "LKR", amount: 4000 },
      ]);
      const user = { role: "user", enterpriseId: null, save: vi.fn().mockResolvedValue(undefined) };
      vi.spyOn(User, "findById").mockResolvedValue(user);

      const result = await verifySubscriptionAgainstPayHere(subscription);

      expect(result.status).toBe("Active");
      expect(result.payHereStatus).toBe("ACTIVE");
      expect(subscription.save).toHaveBeenCalled();
      expect(user.role).toBe("(Pro)PlanUser");
    });

    it("does not crash and leaves the subscription Pending if the PayHere API call itself fails", async () => {
      const subscription = makeSubscription();
      vi.spyOn(payHereService, "getPaymentByOrderId").mockRejectedValue(
        new Error("Request failed with status code 401"),
      );

      const result = await verifySubscriptionAgainstPayHere(subscription);

      expect(result.status).toBe("Pending");
      expect(subscription.save).not.toHaveBeenCalled();
    });
  });

  describe("handlePayHereNotify", () => {
    const buildValidBody = (overrides = {}) => {
      const merchantSecretMd5 = md5Upper(process.env.PAYHERE_MERCHANT_SECRET);
      const base = {
        merchant_id: "1234615",
        order_id: "SERANI-1",
        payhere_amount: "4000.00",
        payhere_currency: "LKR",
        status_code: "2",
        payment_id: "PH-1",
        custom_1: "507f1f77bcf86cd799439011",
        custom_2: "planId:pro|plan:Personal",
        ...overrides,
      };
      const md5sig = md5Upper(
        `${base.merchant_id}${base.order_id}${base.payhere_amount}${base.payhere_currency}${base.status_code}${merchantSecretMd5}`,
      );
      return { ...base, md5sig };
    };

    it("rejects a bad signature", async () => {
      const body = { ...buildValidBody(), md5sig: "not-a-real-signature" };
      const req = { body };
      const res = mockRes();

      await handlePayHereNotify(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("invalid signature");
    });

    it("rejects a mismatched merchant id", async () => {
      const body = buildValidBody({ merchant_id: "9999999" });
      // Recompute signature is intentionally skipped so this fails on the
      // merchant id check before signature verification is even relevant.
      const req = { body };
      const res = mockRes();

      await handlePayHereNotify(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("invalid merchant");
    });

    it("rejects when the notified amount does not match the plan price", async () => {
      const body = buildValidBody({ payhere_amount: "1.00" });
      // The signature in buildValidBody is computed over the tampered
      // amount, so it passes signature verification but must still be
      // rejected by the amount cross-check against PLAN_DETAILS.
      const req = { body };
      const res = mockRes();

      await handlePayHereNotify(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("amount mismatch");
    });

    it("ignores non-success status codes without activating anything", async () => {
      const body = buildValidBody({ status_code: "0" });
      const upsertSpy = vi.spyOn(Subscription, "findOneAndUpdate");
      const req = { body };
      const res = mockRes();

      await handlePayHereNotify(req, res);

      expect(upsertSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith("ignored");
    });

    it("activates the subscription and syncs the user role on a valid notification", async () => {
      const body = buildValidBody();
      vi.spyOn(Subscription, "findOneAndUpdate").mockResolvedValue({ _id: "sub1" });
      vi.spyOn(User, "findById").mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        role: "user",
        save: vi.fn().mockResolvedValue(undefined),
      });

      const req = { body };
      const res = mockRes();

      await handlePayHereNotify(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith("ok");
    });

    it("rejects an invalid custom_1 user id", async () => {
      const body = buildValidBody({ custom_1: "not-an-object-id" });
      const req = { body };
      const res = mockRes();

      await handlePayHereNotify(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("invalid user id");
    });

    it("correctly validates business-plan amounts scaled by seat count", async () => {
      const merchantSecretMd5 = md5Upper(process.env.PAYHERE_MERCHANT_SECRET);
      const base = {
        merchant_id: "1234615",
        order_id: "SERANI-2",
        payhere_amount: "15000.00", // 3000 * 5 seats
        payhere_currency: "LKR",
        status_code: "2",
        payment_id: "PH-2",
        custom_1: "507f1f77bcf86cd799439011",
        custom_2: "planId:business|plan:Business|seats:5",
      };
      const md5sig = md5Upper(
        `${base.merchant_id}${base.order_id}${base.payhere_amount}${base.payhere_currency}${base.status_code}${merchantSecretMd5}`,
      );

      vi.spyOn(Subscription, "findOneAndUpdate").mockResolvedValue({ _id: "sub2" });
      vi.spyOn(User, "findById").mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        role: "user",
        save: vi.fn().mockResolvedValue(undefined),
      });
      vi.spyOn(Enterprise, "findOne").mockResolvedValue(null);
      vi.spyOn(Enterprise, "create").mockResolvedValue({
        _id: "ent1",
        members: [],
      });

      const req = { body: { ...base, md5sig } };
      const res = mockRes();

      await handlePayHereNotify(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith("ok");
    });
  });

});
