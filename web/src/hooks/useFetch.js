import { useQuery } from "@tanstack/react-query";
import { getUsers } from "../api/adminApi";
import { fetchAllTasks } from "../api/tasksApi";
import httpClient from "../api/httpClient";
import { API_BASE_URL } from "../utils/apiBaseUrl";

const ADMIN_API_URL = `${API_BASE_URL}/api/admin`;

// ── Users ──────────────────────────────────────────────
export const useFetchUSers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await getUsers();
      return response.data;
    },
  });
};

// ── Courses ────────────────────────────────────────────
export const useFetchCourses = (search = "") => {
  return useQuery({
    queryKey: ["courses", search],
    queryFn: async () => {
      const url = search
        ? `${ADMIN_API_URL}/courses?search=${encodeURIComponent(search)}`
        : `${ADMIN_API_URL}/courses`;
      const response = await httpClient.get(url);
      return response.data;
    },
  });
};

// ── Course dashboard stats ─────────────────────────────
export const useFetchCourseDashboard = () => {
  return useQuery({
    queryKey: ["course-dashboard"],
    queryFn: async () => {
      const response = await httpClient.get(`${ADMIN_API_URL}/course-dashboard`);
      return response.data;
    },
  });
};

// ── Categories ─────────────────────────────────────────
export const useFetchCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await httpClient.get(`${ADMIN_API_URL}/categories`);
      return response.data;
    },
  });
};

// ── Tasks ──────────────────────────────────────────────
export const useFetchTasks = () => {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const data = await fetchAllTasks();
      return data;
    },
  });
};