import httpClient from "./httpClient";

export const fetchHistory = () => httpClient.get("/chat/history");

export const fetchSession = (id) => httpClient.get(`/chat/session/${id}`);

export const sendMessage = (data) => httpClient.post("/chat", data, {
  headers: {
    "Content-Type": "multipart/form-data",
  },
});

export const deleteSession = (id) => httpClient.delete(`/chat/history/${id}`);

export const clearHistory = () => httpClient.delete("/chat/history");
