import axios from "axios";

const BASE_URL = "http://localhost:7001";
const REFRESH_URL = `${BASE_URL}/api/auth/refresh`;

const httpClient = axios.create({
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((entry) => {
    if (error) {
      entry.reject(error);
      return;
    }
    entry.resolve(token);
  });

  failedQueue = [];
};

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const responseMessage = error.response?.data?.message || "";
    const isExpiredToken =
      error.response?.status === 401 &&
      responseMessage.toLowerCase().includes("token expired");

    if (!originalRequest || originalRequest._retry || !isExpiredToken) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes("/api/auth/refresh")) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return httpClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshResponse = await axios.post(
        REFRESH_URL,
        {},
        { withCredentials: true },
      );
      const newToken = refreshResponse.data?.token;

      if (!newToken) {
        throw new Error("Token refresh did not return a token");
      }

      localStorage.setItem("token", newToken);
      httpClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      processQueue(null, newToken);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newToken}`;

      return httpClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default httpClient;
