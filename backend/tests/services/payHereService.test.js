import { createRequire } from "node:module";
import { beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const axios = require("axios");
const payHereService = require("../../services/payHereService");

// payHereService.js exports a singleton (`module.exports = new
// PayHereService()`) that reads its environment/base URL/credentials once,
// at construction time, and caches an access token across calls. Rather
// than fight the CJS module cache to get a "fresh" instance per test (this
// backend loads services via Node's native require - see the note in
// authController.test.js - so vi.resetModules() has no effect on it), we
// reset the instance's own fields directly between tests, the same way
// tests/services/langchainService.test.js reassigns `langchainService.model`.
describe("payHereService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    payHereService.environment = "sandbox";
    payHereService.baseUrl = "https://sandbox.payhere.lk/merchant/v1";
    payHereService.appId = "app-id";
    payHereService.appSecret = "app-secret";
    payHereService.accessToken = null;
    payHereService.tokenExpiry = null;
  });

  describe("getAccessToken", () => {
    it("requests a token using client-credentials basic auth", async () => {
      vi.spyOn(axios, "post").mockResolvedValue({
        data: { access_token: "token-123", expires_in: 3600 },
      });

      const token = await payHereService.getAccessToken();

      expect(token).toBe("token-123");
      expect(axios.post).toHaveBeenCalledWith(
        "https://sandbox.payhere.lk/merchant/v1/oauth/token",
        { grant_type: "client_credentials" },
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Basic "),
          }),
        }),
      );
    });

    it("uses the live base URL when configured for the live environment", async () => {
      payHereService.environment = "live";
      payHereService.baseUrl = "https://www.payhere.lk/merchant/v1";
      vi.spyOn(axios, "post").mockResolvedValue({
        data: { access_token: "token-123", expires_in: 3600 },
      });

      await payHereService.getAccessToken();

      expect(axios.post).toHaveBeenCalledWith(
        "https://www.payhere.lk/merchant/v1/oauth/token",
        expect.anything(),
        expect.anything(),
      );
    });

    it("returns a cached token instead of requesting a new one while still valid", async () => {
      vi.spyOn(axios, "post").mockResolvedValue({
        data: { access_token: "token-123", expires_in: 3600 },
      });

      await payHereService.getAccessToken();
      await payHereService.getAccessToken();

      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    it("requests a new token once the cached one has expired", async () => {
      vi.spyOn(axios, "post").mockResolvedValue({
        data: { access_token: "token-123", expires_in: 3600 },
      });
      await payHereService.getAccessToken();

      // Simulate the cached token having already expired.
      payHereService.tokenExpiry = Date.now() - 1000;

      await payHereService.getAccessToken();

      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it("throws when app credentials are not configured", async () => {
      payHereService.appId = "";
      payHereService.appSecret = "";

      await expect(payHereService.getAccessToken()).rejects.toThrow(
        "PayHere app credentials not configured",
      );
    });
  });

  describe("getSubscriptions", () => {
    it("returns the data array on success", async () => {
      vi.spyOn(axios, "post").mockResolvedValue({
        data: { access_token: "token-123", expires_in: 3600 },
      });
      vi.spyOn(axios, "get").mockResolvedValue({
        data: { status: 1, data: [{ subscription_id: "sub_1" }] },
      });

      const result = await payHereService.getSubscriptions();

      expect(result).toEqual([{ subscription_id: "sub_1" }]);
      expect(axios.get).toHaveBeenCalledWith(
        "https://sandbox.payhere.lk/merchant/v1/subscription",
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer token-123" }),
        }),
      );
    });

    it("throws when PayHere reports a non-success status", async () => {
      vi.spyOn(axios, "post").mockResolvedValue({
        data: { access_token: "token-123", expires_in: 3600 },
      });
      vi.spyOn(axios, "get").mockResolvedValue({
        data: { status: 0, msg: "unauthorized" },
      });

      await expect(payHereService.getSubscriptions()).rejects.toThrow("unauthorized");
    });
  });

  describe("getSubscriptionPayments", () => {
    it("fetches payments for a subscription", async () => {
      vi.spyOn(axios, "post").mockResolvedValue({
        data: { access_token: "token-123", expires_in: 3600 },
      });
      vi.spyOn(axios, "get").mockResolvedValue({
        data: { status: 1, data: [{ payment_id: "pay_1" }] },
      });

      const result = await payHereService.getSubscriptionPayments("sub_1");

      expect(result).toEqual([{ payment_id: "pay_1" }]);
      expect(axios.get).toHaveBeenCalledWith(
        "https://sandbox.payhere.lk/merchant/v1/subscription/sub_1/payments",
        expect.anything(),
      );
    });

    it("throws when PayHere reports a non-success status", async () => {
      vi.spyOn(axios, "post").mockResolvedValue({
        data: { access_token: "token-123", expires_in: 3600 },
      });
      vi.spyOn(axios, "get").mockResolvedValue({
        data: { status: 0, msg: "not found" },
      });

      await expect(payHereService.getSubscriptionPayments("sub_1")).rejects.toThrow(
        "not found",
      );
    });
  });

  describe("retrySubscription", () => {
    it("returns success message on retry", async () => {
      vi.spyOn(axios, "post")
        .mockResolvedValueOnce({ data: { access_token: "token-123", expires_in: 3600 } })
        .mockResolvedValueOnce({ data: { status: 1, msg: "Retry scheduled" } });

      const result = await payHereService.retrySubscription("sub_1");

      expect(result).toEqual({ success: true, message: "Retry scheduled" });
      expect(axios.post).toHaveBeenLastCalledWith(
        "https://sandbox.payhere.lk/merchant/v1/subscription/retry",
        { subscription_id: "sub_1" },
        expect.anything(),
      );
    });

    it("throws PayHere's error message when retry fails", async () => {
      vi.spyOn(axios, "post")
        .mockResolvedValueOnce({ data: { access_token: "token-123", expires_in: 3600 } })
        .mockResolvedValueOnce({ data: { status: 0, msg: "Cannot retry" } });

      await expect(payHereService.retrySubscription("sub_1")).rejects.toThrow("Cannot retry");
    });
  });

  describe("cancelSubscription", () => {
    it("returns success message on cancel", async () => {
      vi.spyOn(axios, "post")
        .mockResolvedValueOnce({ data: { access_token: "token-123", expires_in: 3600 } })
        .mockResolvedValueOnce({ data: { status: 1, msg: "Cancelled" } });

      const result = await payHereService.cancelSubscription("sub_1");

      expect(result).toEqual({ success: true, message: "Cancelled" });
      expect(axios.post).toHaveBeenLastCalledWith(
        "https://sandbox.payhere.lk/merchant/v1/subscription/cancel",
        { subscription_id: "sub_1" },
        expect.anything(),
      );
    });

    it("surfaces the API error message when cancel fails", async () => {
      vi.spyOn(axios, "post")
        .mockResolvedValueOnce({ data: { access_token: "token-123", expires_in: 3600 } })
        .mockRejectedValueOnce({ response: { data: { msg: "Already cancelled" } } });

      await expect(payHereService.cancelSubscription("sub_1")).rejects.toThrow(
        "Already cancelled",
      );
    });
  });

  describe("syncSubscription", () => {
    it("finds and returns the matching subscription by id", async () => {
      vi.spyOn(axios, "post").mockResolvedValue({
        data: { access_token: "token-123", expires_in: 3600 },
      });
      vi.spyOn(axios, "get").mockResolvedValue({
        data: {
          status: 1,
          data: [
            { subscription_id: "sub_1", status: "ACTIVE" },
            { subscription_id: "sub_2", status: "CANCELLED" },
          ],
        },
      });

      const result = await payHereService.syncSubscription("sub_2");

      expect(result).toEqual({ subscription_id: "sub_2", status: "CANCELLED" });
    });

    it("throws when the subscription is not found on PayHere", async () => {
      vi.spyOn(axios, "post").mockResolvedValue({
        data: { access_token: "token-123", expires_in: 3600 },
      });
      vi.spyOn(axios, "get").mockResolvedValue({
        data: { status: 1, data: [] },
      });

      await expect(payHereService.syncSubscription("missing")).rejects.toThrow(
        "Subscription not found on PayHere",
      );
    });
  });
});
