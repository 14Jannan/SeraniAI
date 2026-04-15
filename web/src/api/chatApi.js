import httpClient from "./httpClient";

const API_URL = "http://localhost:7001/api/chat";

export const fetchHistory = () => httpClient.get(`${API_URL}/history`);

export const fetchSession = (id) => httpClient.get(`${API_URL}/session/${id}`);

export const sendMessage = (data) => {
  const config = getHeaders();
  // If data is FormData, axios handles headers automatically, but we still need Auth
  return axios.post(`${API_URL}`, data, config);
};

export const deleteSession = (id) =>
  httpClient.delete(`${API_URL}/history/${id}`);

export const clearHistory = () => httpClient.delete(`${API_URL}/history`);
