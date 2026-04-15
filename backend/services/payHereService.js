const axios = require('axios');

class PayHereService {
  constructor() {
    this.environment = (process.env.PAYHERE_ENV || 'sandbox').toLowerCase();
    this.baseUrl =
      this.environment === 'live'
        ? 'https://www.payhere.lk/merchant/v1'
        : 'https://sandbox.payhere.lk/merchant/v1';

    this.appId = String(process.env.PAYHERE_APP_ID || '').trim();
    this.appSecret = String(process.env.PAYHERE_APP_SECRET || '').trim();

    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get or generate a fresh access token
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.appId || !this.appSecret) {
      throw new Error('PayHere app credentials not configured');
    }

    try {
      const auth = Buffer.from(`${this.appId}:${this.appSecret}`).toString('base64');

      const response = await axios.post(`${this.baseUrl}/oauth/token`, {
        grant_type: 'client_credentials',
      }, {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000 * 0.9); // Refresh 10% before expiry

      return this.accessToken;
    } catch (error) {
      console.error('Failed to get PayHere access token:', error.message);
      throw error;
    }
  }

  /**
   * Get authorization headers with access token
   */
  async getAuthHeaders() {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * View all subscriptions
   */
  async getSubscriptions() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get(`${this.baseUrl}/subscription`, { headers });

      if (response.data.status !== 1) {
        throw new Error(response.data.msg || 'Failed to fetch subscriptions');
      }

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching PayHere subscriptions:', error.message);
      throw error;
    }
  }

  /**
   * View payments of a specific subscription
   */
  async getSubscriptionPayments(subscriptionId) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get(
        `${this.baseUrl}/subscription/${subscriptionId}/payments`,
        { headers }
      );

      if (response.data.status !== 1) {
        throw new Error(response.data.msg || 'Failed to fetch payments');
      }

      return response.data.data || [];
    } catch (error) {
      console.error(`Error fetching payments for subscription ${subscriptionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Retry a failed subscription
   */
  async retrySubscription(subscriptionId) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post(
        `${this.baseUrl}/subscription/retry`,
        { subscription_id: subscriptionId },
        { headers }
      );

      if (response.data.status !== 1) {
        throw new Error(response.data.msg || 'Failed to retry subscription');
      }

      return { success: true, message: response.data.msg };
    } catch (error) {
      const errorMsg = error.response?.data?.msg || error.message;
      console.error(`Error retrying subscription ${subscriptionId}:`, errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post(
        `${this.baseUrl}/subscription/cancel`,
        { subscription_id: subscriptionId },
        { headers }
      );

      if (response.data.status !== 1) {
        throw new Error(response.data.msg || 'Failed to cancel subscription');
      }

      return { success: true, message: response.data.msg };
    } catch (error) {
      const errorMsg = error.response?.data?.msg || error.message;
      console.error(`Error canceling subscription ${subscriptionId}:`, errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Sync a single subscription from PayHere
   */
  async syncSubscription(payHereSubscriptionId) {
    try {
      const subscriptions = await this.getSubscriptions();
      const subscription = subscriptions.find(
        (sub) => sub.subscription_id === payHereSubscriptionId
      );

      if (!subscription) {
        throw new Error('Subscription not found on PayHere');
      }

      return subscription;
    } catch (error) {
      console.error(`Error syncing subscription ${payHereSubscriptionId}:`, error.message);
      throw error;
    }
  }
}

module.exports = new PayHereService();
