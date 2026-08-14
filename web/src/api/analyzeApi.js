import httpClient from "./httpClient";
import { API_BASE_URL } from "../utils/apiBaseUrl";

const API_URL = `${API_BASE_URL}/api/chat`;

export const fetchAnalysis = () => httpClient.get(`${API_URL}/analyze`);
