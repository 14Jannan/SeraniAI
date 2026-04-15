import axios from "axios";
import { tokenStorage } from "../utils/tokenStorage";
import { getApiBaseUrl } from "./baseUrl";

// Configure base URL from Constants (defined in app.json extra section)
const API_URL = getApiBaseUrl();

const httpClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Store for queued requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Request Interceptor: Add Authorization header
httpClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await tokenStorage.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error in request interceptor:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response Interceptor: Handle token expiry and refresh
httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and message contains "token expired"
    if (
      error.response?.status === 401 &&
      error.response?.data?.message?.includes("token expired") &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // Queue the request while token is being refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return httpClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Call refresh endpoint
        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          { refreshToken },
          { withCredentials: true },
        );

        const { accessToken, newRefreshToken } = response.data;

        // Save new tokens
        await tokenStorage.saveToken(
          accessToken,
          newRefreshToken || refreshToken,
          response.data.expiresIn,
        );

        // Update Authorization header
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Process queued requests
        processQueue(null, accessToken);

        return httpClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        await tokenStorage.clearTokens();
        processQueue(refreshError, null);

        // Emit event to trigger logout in AuthContext
        // (we'll handle this via a global error handler)
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default httpClient;
