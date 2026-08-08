import httpClient from "./httpClient";

const API_URL = "http://localhost:7001/api/chat";

export const fetchAnalysis = () => httpClient.get(`${API_URL}/analyze`);
