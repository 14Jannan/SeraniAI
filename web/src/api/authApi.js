import axios from 'axios';

// Point to your Backend URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7001';
const API_URL = `${API_BASE}/api/auth`;

export const register = async (userData) => {
  const response = await axios.post(`${API_URL}/register`, userData);
  return response.data;
};

export const verifyOtp = async (data) => {
  const response = await axios.post(`${API_URL}/verify`, data);
  return response.data;
};

export const login = async (userData) => {
  const response = await axios.post(`${API_URL}/login`, userData);
  return response.data;
};

export const forgotPassword = (data) => axios.post(`${API_URL}/forgot-password`, data);
export const resetPassword = (data) => axios.post(`${API_URL}/reset-password`, data);
