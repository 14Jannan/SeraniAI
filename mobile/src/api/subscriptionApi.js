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

  async confirmReturn(orderId) {
    const response = await httpClient.post("/billing/payhere/confirm-return", {
      orderId,
    });
    return response.data;
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
};

export default subscriptionApi;