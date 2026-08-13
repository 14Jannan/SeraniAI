import httpClient from "./httpClient";

const subscriptionApi = {
  async getCurrentSubscription() {
    const response = await httpClient.get("/subscriptions/user/current");
    return response.data;
  },

  async initializeCheckout({ planId, seats = 1, returnUrl, cancelUrl }) {
    const response = await httpClient.post("/billing/payhere", {
      planId,
      seats,
      returnUrl,
      cancelUrl,
    });
    return response.data;
  },

  // Activation only happens server-side once PayHere's signed webhook lands;
  // this endpoint is read-only and just reports current status. Poll briefly
  // (the webhook usually arrives within a second or two of app return) so we
  // don't tell the user "complete" before the plan is actually active.
  async confirmReturn(orderId, { attempts = 5, delayMs = 1500 } = {}) {
    let lastData = null;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const response = await httpClient.post("/billing/payhere/confirm-return", {
        orderId,
      });
      lastData = response.data;

      if (!lastData?.pending) {
        return lastData;
      }

      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return lastData;
  },

  async cancelSubscription(subscriptionId) {
    const response = await httpClient.post(
      `/subscriptions/${subscriptionId}/cancel`,
    );
    return response.data;
  },

  async retrySubscription(subscriptionId) {
    const response = await httpClient.post(
      `/subscriptions/${subscriptionId}/retry`,
    );
    return response.data;
  },

  async cancelEnterprisePremiumAccess() {
    const response = await httpClient.post("/auth/enterprise/cancel-premium");
    return response.data;
  },
};

export default subscriptionApi;