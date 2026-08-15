import httpClient from "./httpClient";
import { API_BASE_URL } from "../utils/apiBaseUrl";

// Point to your Backend URL
const API_URL = `${API_BASE_URL}/api/auth`;

export const register = async (userData) => {
  const response = await httpClient.post(`${API_URL}/register`, userData);
  return response.data;
};

export const verifyOtp = async (data) => {
  const response = await httpClient.post(`${API_URL}/verify`, data);
  return response.data;
};

export const login = async (userData) => {
  const response = await httpClient.post(`${API_URL}/login`, userData);
  return response.data;
};

export const resendOtp = async (data) => {
  const response = await httpClient.post(`${API_URL}/resend-otp`, data);
  return response.data;
};

export const forgotPassword = (data) =>
  httpClient.post(`${API_URL}/forgot-password`, data);

export const resetPassword = (data) =>
  httpClient.post(`${API_URL}/reset-password`, data);

export const getCurrentUser = () => httpClient.get(`${API_URL}/me`);
export const updateCurrentUser = (data) => httpClient.patch(`${API_URL}/me`, data);
export const deleteCurrentUser = () => httpClient.delete(`${API_URL}/me`);

export const acceptEnterpriseInvite = (token) =>
  httpClient.post(`${API_URL}/invites/accept`, { token });

export const cancelEnterprisePremiumAccess = () =>
  httpClient.post(`${API_URL}/enterprise/cancel-premium`);

export const updateOnboarding = (data) =>
  httpClient.post(`${API_URL}/onboarding`, data);
