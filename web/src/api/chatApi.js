import httpClient from "./httpClient";
import { API_BASE_URL } from "../utils/apiBaseUrl";

const API_URL = `${API_BASE_URL}/api/chat`;

export const fetchHistory = () => httpClient.get(`${API_URL}/history`);

export const fetchSession = (id) => httpClient.get(`${API_URL}/session/${id}`);

export const sendMessage = (data) =>
  httpClient.post(`${API_URL}`, data);

export const deleteSession = (id) =>
  httpClient.delete(`${API_URL}/history/${id}`);

export const clearHistory = () => httpClient.delete(`${API_URL}/history`);
