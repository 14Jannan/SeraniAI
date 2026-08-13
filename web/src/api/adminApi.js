// File: src/api/adminApi.js

import httpClient from "./httpClient";
import { API_BASE_URL } from "../config/api";

const ADMIN_API_URL = `${API_BASE_URL}/api/admin`;

export const getUsers = () => {
  return httpClient.get(`${ADMIN_API_URL}/users`);
};

export const addUser = (userData) => {
  return httpClient.post(`${ADMIN_API_URL}/users`, userData);
};

export const updateUser = (id, userData) => {
  return httpClient.put(`${ADMIN_API_URL}/users/${id}`, userData);
};

export const deleteUser = (id) => {
  return httpClient.delete(`${ADMIN_API_URL}/users/${id}`);
};
