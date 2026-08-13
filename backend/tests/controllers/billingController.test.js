import { createRequire } from "node:module";
import { beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const crypto = require("crypto");
const Subscription = require("../../models/subscriptionModel");
const User = require("../../models/userModel");
const Enterprise = require("../../models/enterpriseModel");
const billingController = require("../../controllers/billingController");

const USER_ID = "507f191e810c19729de860e1";
const ORDER_ID = "SERANI-1700000000000";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.set = vi.fn().mockReturnValue(res);
  res.redirect = vi.fn().mockReturnValue(res);
  return res;
};

const md5Upper = (value) =>
  crypto.createHash("md5").update(String(value)).digest("hex").toUpperCase();

describe("billingController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    process.env.PAYHERE_MERCHANT_ID = "merchant-123";
    process.env.PAYHERE_MERCHANT_SECRET = "top-secret";
    process.env.PAYHERE_SECRET_FORMAT = "plain";
    process.env.PAYHERE_ENV = "sandbox";
    process.env.FRONTEND_URL = "http://localhost:5173";
    delete process.env.BACKEND_URL;
    delete process.env.PAYHERE_NOTIFY_URL;
    delete process.env.PAYHERE_RETURN_URL;
    delete process.env.PAYHERE_CANCEL_URL;
  });

  describe("initializePayHerePayment", () => {
    const makeReq = (overrides = {}) => ({
      body: { planId: "pro" },
      user: { _id: USER_ID, name: "Alice", email: "alice@test.com", role: "user" },
      get: () => "localhost:7001",
      protocol: "http",
      ...overrides,
    });

    it("rejects enterprise users who already have enterprise premium access", async () => {
      const req = makeReq({ user: { _id: USER_ID, role: "enterpriseUser" } });
      const res = mockRes();

      await billingController.initializePayHerePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining("enterprise premium access") }),
      );
    });

    it("rejects when the user already has an active subscription", async () => {
      vi.spyOn(Subscription, "findOne").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ _id: "sub1", status: "Active" }),
        }),
      });
      const req = makeReq();
      const res = mockRes();

      await billingController.initializePayHerePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining("already have an active plan") }),
      );
    });

    it("rejects an invalid plan id", async () => {
      vi.spyOn(Subscription, "findOne").mockReturnValue({
        sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      });
      const req = makeReq({ body: { planId: "unknown-plan" } });
      const res = mockRes();

      await billingController.initializePayHerePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining("Invalid plan") }),
      );
    });

    it("returns 500 when PayHere merchant credentials are missing", async () => {
      delete process.env.PAYHERE_MERCHANT_ID;
      vi.spyOn(Subscription, "findOne").mockReturnValue({
        sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      });
      const req = makeReq();
      const res = mockRes();

      await billingController.initializePayHerePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining("merchant configuration") }),
      );
    });

    it("creates a Pending subscription and returns a signed PayHere payload for a personal plan", async () => {
      vi.spyOn(Subscription, "findOne").mockReturnValue({
        sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      });
      const upsertSpy = vi
        .spyOn(Subscription, "findOneAndUpdate")
        .mockResolvedValue({ _id: "sub-new" });

      const req = makeReq();
      const res = mockRes();

      await billingController.initializePayHerePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.payload.amount).toBe("4000.00");
      expect(jsonArg.payload.currency).toBe("LKR");
      expect(jsonArg.payload.merchant_id).toBe("merchant-123");
      expect(jsonArg.payload.custom_1).toBe(USER_ID);
      expect(jsonArg.checkoutUrl).toContain("/api/billing/payhere/launch/");

      // Verify the hash matches PayHere's documented formula so a tampered
      // amount/currency would be rejected by PayHere itself.
      const expectedHash = md5Upper(
        `merchant-123${jsonArg.payload.order_id}4000.00LKR${md5Upper("top-secret")}`,
      );
      expect(jsonArg.payload.hash).toBe(expectedHash);

      expect(upsertSpy).toHaveBeenCalledWith(
        { paymentId: jsonArg.payload.order_id },
        expect.objectContaining({ status: "Pending", planCode: "pro", seats: 1 }),
        expect.objectContaining({ upsert: true }),
      );
    });

    it("enforces the 5-seat minimum for business plans regardless of requested seats", async () => {
      vi.spyOn(Subscription, "findOne").mockReturnValue({
        sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      });
      vi.spyOn(Subscription, "findOneAndUpdate").mockResolvedValue({ _id: "sub-new" });

      const req = makeReq({ body: { planId: "business", seats: 2 } });
      const res = mockRes();

      await billingController.initializePayHerePayment(req, res);

      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.payload.amount).toBe((3000 * 5).toFixed(2));
      expect(jsonArg.payload.custom_2).toContain("seats:5");
    });
  });

  describe("handlePayHereNotify", () => {
    const buildValidNotifyBody = (overrides = {}) => {
      const base = {
        merchant_id: "merchant-123",
        order_id: ORDER_ID,
        payhere_amount: "4000.00",
        payhere_currency: "LKR",
        status_code: "2",
        custom_1: USER_ID,
        custom_2: "planId:pro|plan:Personal",
        payment_id: "pay_1",
      };
      const merged = { ...base, ...overrides };
      merged.md5sig = md5Upper(
        `${merged.merchant_id}${merged.order_id}${merged.payhere_amount}${merged.payhere_currency}${merged.status_code}${md5Upper("top-secret")}`,
      );
      return merged;
    };

    it("rejects requests with the wrong merchant id", async () => {
      const req = { body: buildValidNotifyBody({ merchant_id: "someone-else" }) };
      const res = mockRes();

      await billingController.handlePayHereNotify(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("invalid merchant");
    });

    it("rejects requests with an invalid signature", async () => {
      const body = buildValidNotifyBody();
      body.md5sig = "tampered-signature";
      const req = { body };
      const res = mockRes();

      await billingController.handlePayHereNotify(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("invalid signature");
    });

    it("ignores non-success status codes without activating anything", async () => {
      const req = { body: buildValidNotifyBody({ status_code: "-1" }) };
      const upsertSpy = vi.spyOn(Subscription, "findOneAndUpdate");
      const res = mockRes();

      await billingController.handlePayHereNotify(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith("ignored");
      expect(upsertSpy).not.toHaveBeenCalled();
    });

    it("rejects an invalid/malformed user id in custom_1", async () => {
      const req = { body: buildValidNotifyBody({ custom_1: "not-an-object-id" }) };
      const res = mockRes();

      await billingController.handlePayHereNotify(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("invalid user id");
    });

    it("rejects a non-LKR currency", async () => {
      const req = { body: buildValidNotifyBody({ payhere_currency: "USD" }) };
      const res = mockRes();

      await billingController.handlePayHereNotify(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("invalid currency");
    });

    it("rejects an unrecognized plan payload", async () => {
      const req = { body: buildValidNotifyBody({ custom_2: "garbage" }) };
      const res = mockRes();

      await billingController.handlePayHereNotify(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("invalid plan payload");
    });

    it("activates the subscription and syncs the user's role on a valid, signed payment", async () => {
      const upsertSpy = vi
        .spyOn(Subscription, "findOneAndUpdate")
        .mockResolvedValue({ _id: "sub1" });
      const user = { _id: USER_ID, name: "Alice", role: "user", save: vi.fn().mockResolvedValue() };
      vi.spyOn(User, "findById").mockResolvedValue(user);

      const req = { body: buildValidNotifyBody() };
      const res = mockRes();

      await billingController.handlePayHereNotify(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith("ok");
      expect(upsertSpy).toHaveBeenCalledWith(
        { paymentId: { $in: ["pay_1", ORDER_ID] } },
        expect.objectContaining({ status: "Active", planCode: "pro", plan: "Personal" }),
        expect.objectContaining({ upsert: true }),
      );
      expect(user.role).toBe("(Pro)PlanUser");
      expect(user.save).toHaveBeenCalled();
    });
  });

  describe("handlePayHereReturnRedirect (public, unauthenticated)", () => {
    it("requires an order_id", async () => {
      const req = { query: {} };
      const res = mockRes();

      await billingController.handlePayHereReturnRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when the order does not exist", async () => {
      vi.spyOn(Subscription, "findOne").mockResolvedValue(null);
      const req = { query: { order_id: ORDER_ID } };
      const res = mockRes();

      await billingController.handlePayHereReturnRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    // Regression test for the security fix: this public, unauthenticated
    // endpoint must NEVER activate a subscription itself - only the signed
    // PayHere webhook (handlePayHereNotify) may do that. Previously this
    // handler flipped status to "Active" and upgraded the user's role just
    // because someone visited this URL with a known order_id.
    it("does NOT activate a still-pending subscription, and reports it as pending", async () => {
      const subscription = {
        status: "Pending",
        returnUrl: "http://localhost:5173/subscription",
        save: vi.fn().mockResolvedValue(),
      };
      vi.spyOn(Subscription, "findOne").mockResolvedValue(subscription);
      const syncSpy = vi.spyOn(User, "findById");

      const req = { query: { order_id: ORDER_ID } };
      const res = mockRes();

      await billingController.handlePayHereReturnRedirect(req, res);

      expect(subscription.status).toBe("Pending");
      expect(subscription.save).not.toHaveBeenCalled();
      expect(syncSpy).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("payment=pending"),
      );
    });

    it("redirects with payment=success when the webhook has already activated the subscription", async () => {
      const subscription = {
        status: "Active",
        returnUrl: "http://localhost:5173/subscription",
      };
      vi.spyOn(Subscription, "findOne").mockResolvedValue(subscription);

      const req = { query: { order_id: ORDER_ID } };
      const res = mockRes();

      await billingController.handlePayHereReturnRedirect(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("payment=success"),
      );
    });
  });

  describe("confirmPayHereReturn (authenticated polling endpoint)", () => {
    it("returns 401 when not authenticated", async () => {
      const req = { user: null, body: { orderId: ORDER_ID } };
      const res = mockRes();

      await billingController.confirmPayHereReturn(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 when orderId is missing", async () => {
      const req = { user: { _id: USER_ID }, body: {} };
      const res = mockRes();

      await billingController.confirmPayHereReturn(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when no matching pending subscription exists for this user", async () => {
      vi.spyOn(Subscription, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });
      const req = { user: { _id: USER_ID }, body: { orderId: ORDER_ID } };
      const res = mockRes();

      await billingController.confirmPayHereReturn(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    // Regression test for the security fix: previously this endpoint would
    // flip a "Pending" subscription straight to "Active" (and grant the
    // plan's role) just because the logged-in user called it. Now it must
    // only ever report the subscription's real status.
    it("does NOT activate the subscription while PayHere's webhook has not confirmed it yet, and returns 202", async () => {
      vi.spyOn(Subscription, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({ status: "Pending", paymentId: ORDER_ID, userId: USER_ID }),
      });
      const userFindSpy = vi.spyOn(User, "findById");

      const req = { user: { _id: USER_ID }, body: { orderId: ORDER_ID } };
      const res = mockRes();

      await billingController.confirmPayHereReturn(req, res);

      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ pending: true }),
      );
      expect(userFindSpy).not.toHaveBeenCalled();
    });

    it("returns the confirmed user and subscription once the webhook has already activated it", async () => {
      vi.spyOn(Subscription, "findOne").mockReturnValue({
        lean: vi
          .fn()
          .mockResolvedValue({ status: "Active", paymentId: ORDER_ID, userId: USER_ID, planCode: "pro" }),
      });
      vi.spyOn(User, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: USER_ID, role: "(Pro)PlanUser" }),
      });

      const req = { user: { _id: USER_ID }, body: { orderId: ORDER_ID } };
      const res = mockRes();

      await billingController.confirmPayHereReturn(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Subscription payment confirmed",
          user: expect.objectContaining({ role: "(Pro)PlanUser" }),
        }),
      );
    });
  });

  describe("launchPayHereCheckout", () => {
    it("requires an orderId", async () => {
      const req = { params: {} };
      const res = mockRes();

      await billingController.launchPayHereCheckout(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when the subscription order does not exist", async () => {
      vi.spyOn(Subscription, "findOne").mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
      const req = { params: { orderId: ORDER_ID } };
      const res = mockRes();

      await billingController.launchPayHereCheckout(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("renders an auto-submitting PayHere form for a valid pending order", async () => {
      vi.spyOn(Subscription, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          paymentId: ORDER_ID,
          orderId: ORDER_ID,
          planCode: "pro",
          plan: "Personal",
          amount: 4000,
          currency: "LKR",
          userId: USER_ID,
          userName: "Alice",
          userEmail: "alice@test.com",
        }),
      });
      const req = { params: { orderId: ORDER_ID }, get: () => "localhost:7001", protocol: "http" };
      const res = mockRes();

      await billingController.launchPayHereCheckout(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.set).toHaveBeenCalledWith("Content-Type", "text/html");
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining("payhere-form"));
    });
  });

  describe("handlePayHereCancelRedirect", () => {
    it("requires an order_id", async () => {
      const req = { query: {} };
      const res = mockRes();

      await billingController.handlePayHereCancelRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("redirects to the cancel URL with payment=cancelled", async () => {
      vi.spyOn(Subscription, "findOne").mockResolvedValue({
        cancelUrl: "http://localhost:5173/subscription",
      });
      const req = { query: { order_id: ORDER_ID } };
      const res = mockRes();

      await billingController.handlePayHereCancelRedirect(req, res);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("payment=cancelled"));
    });
  });
});
