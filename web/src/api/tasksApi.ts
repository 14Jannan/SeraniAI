import type { TaskData, TaskProgress } from "../components/tasks/taskTypes";

const API_BASE = "http://localhost:7001/api/tasks";

function authHeaders() {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    let message = fallbackMessage;
    try {
      const body = await res.json();
      message = body?.message || fallbackMessage;
    } catch {
      // Ignore parse errors and throw fallback.
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export async function fetchAllTasks(params?: { q?: string; category?: string; activeOnly?: boolean }) {
  const searchParams = new URLSearchParams();

  if (params?.q) searchParams.set("q", params.q);
  if (params?.category) searchParams.set("category", params.category);
  if (typeof params?.activeOnly === "boolean") {
    searchParams.set("activeOnly", String(params.activeOnly));
  }

  const query = searchParams.toString();
  const res = await fetch(`${API_BASE}${query ? `?${query}` : ""}`, {
    headers: authHeaders(),
  });

  return parseResponse<TaskData[]>(res, "Failed to fetch tasks");
}

export async function createTask(payload: Partial<TaskData>) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse<TaskData>(res, "Failed to create task");
}

export async function updateTask(id: string, payload: Partial<TaskData>) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse<TaskData>(res, "Failed to update task");
}

export async function deleteTask(id: string) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  return parseResponse<{ message: string }>(res, "Failed to delete task");
}

export async function fetchDailyTasks() {
  const res = await fetch(`${API_BASE}/daily`, {
    headers: authHeaders(),
  });

  return parseResponse<{ dateKey: string; tasks: TaskData[]; progress: TaskProgress }>(
    res,
    "Failed to fetch daily tasks"
  );
}

export async function fetchTaskProgress(dateKey?: string) {
  const query = dateKey ? `?dateKey=${encodeURIComponent(dateKey)}` : "";
  const res = await fetch(`${API_BASE}/progress/me${query}`, {
    headers: authHeaders(),
  });

  return parseResponse<TaskProgress>(res, "Failed to fetch task progress");
}

export async function saveTaskProgress(payload: {
  dateKey: string;
  taskIds: string[];
  completedTaskIds: string[];
  taskResults: Record<string, unknown>;
}) {
  const res = await fetch(`${API_BASE}/progress/me`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse<TaskProgress>(res, "Failed to save task progress");
}

export async function fetchTaskStreak() {
  const token = localStorage.getItem("token") || "";
  const res = await fetch("http://localhost:7001/api/streak/me", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ taskStreakCount?: number; streakCount?: number }>(res, "Failed to fetch streak");
}
