// File: src/api/adminApi.js

import httpClient from "./httpClient";

const ADMIN_API_URL = "http://localhost:7001/api/admin";

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
