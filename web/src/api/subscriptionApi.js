import httpClient from "./httpClient";
import { API_BASE_URL } from "../utils/apiBaseUrl";

/* API configuration for subscription endpoints */
const API_URL = API_BASE_URL;
const SUBSCRIPTIONS_API_URL = `${API_URL}/api/subscriptions`;

/* Fetch all subscriptions (admin only) */
export const fetchSubscriptions = () => httpClient.get(SUBSCRIPTIONS_API_URL);

/* Fetch current user's subscription details */
export const getUserSubscription = () =>
  httpClient.get(`${SUBSCRIPTIONS_API_URL}/user/current`);

/* Fetch subscription by ID */
export const getSubscriptionById = (id) =>
  httpClient.get(`${SUBSCRIPTIONS_API_URL}/${id}`);

/* Delete subscription by ID (admin only) */
export const deleteSubscriptionById = (id) =>
  httpClient.delete(`${SUBSCRIPTIONS_API_URL}/${id}`);

/* Cancel subscription by ID (user action) */
export const cancelSubscription = (id) =>
  httpClient.post(`${SUBSCRIPTIONS_API_URL}/${id}/cancel`);
