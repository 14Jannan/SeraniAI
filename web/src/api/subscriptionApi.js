import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:7001";

const API = axios.create({
  baseURL: `${API_BASE}/api`,
});

// Attach token if you use auth
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// GET all subscriptions
export const fetchSubscriptions = () => API.get("/subscriptions");

// GET user's current subscription
export const getUserSubscription = () => API.get("/subscriptions/user/current");

// GET subscription by ID
export const getSubscriptionById = (id) => API.get(`/subscriptions/${id}`);
