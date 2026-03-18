import axios from "axios";

const API_URL = "http://localhost:7001/api/chat";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

export const fetchHistory = () => axios.get(`${API_URL}/history`, getHeaders());

export const fetchSession = (id) =>
  axios.get(`${API_URL}/session/${id}`, getHeaders());

export const sendMessage = (message, sessionId) =>
  axios.post(
    `${API_URL}`,
    { message, sessionId },
    getHeaders()
  );

export const deleteSession = (id) =>
  axios.delete(`${API_URL}/history/${id}`, getHeaders());

export const clearHistory = () =>
  axios.delete(`${API_URL}/history`, getHeaders());
