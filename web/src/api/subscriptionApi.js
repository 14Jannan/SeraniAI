import httpClient from "./httpClient";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:7001";
const API_URL = `${BASE_URL}/api/subscriptions`;

// GET all subscriptions
export const fetchSubscriptions = () => httpClient.get(API_URL);

// GET user's current subscription
export const getUserSubscription = () => httpClient.get(`${API_URL}/user/current`);

// GET subscription by ID
export const getSubscriptionById = (id) => httpClient.get(`${API_URL}/${id}`);

// DELETE subscription by ID (admin)
export const deleteSubscriptionById = (id) => httpClient.delete(`${API_URL}/${id}`);

// CANCEL subscription by ID (user)
export const cancelSubscription = (id) => httpClient.post(`${API_URL}/${id}/cancel`);
