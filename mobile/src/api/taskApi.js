import httpClient from "./httpClient";

const uniqueIds = (ids) => {
  if (!Array.isArray(ids)) {
    return [];
  }

  return Array.from(
    new Set(ids.map((id) => String(id || "").trim()).filter(Boolean)),
  );
};

const normalizeDateKey = (value) => {
  const key = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : "";
};

const taskApi = {
  async fetchDailyTasks() {
    const response = await httpClient.get("/tasks/daily");
    return response.data;
  },

  async fetchTaskProgress(dateKey) {
    const safeDateKey = normalizeDateKey(dateKey);
    const response = await httpClient.get("/tasks/progress/me", {
      params: safeDateKey ? { dateKey: safeDateKey } : undefined,
    });
    return response.data;
  },

  async saveTaskProgress(payload) {
    const dateKey = normalizeDateKey(payload?.dateKey);
    if (!dateKey) {
      throw new Error("Valid dateKey is required");
    }

    const taskIds = uniqueIds(payload?.taskIds);
    const completedTaskIds = uniqueIds(payload?.completedTaskIds).filter((id) =>
      taskIds.includes(id),
    );

    const taskResults =
      payload?.taskResults && typeof payload.taskResults === "object"
        ? payload.taskResults
        : {};

    const safePayload = {
      dateKey,
      taskIds,
      completedTaskIds,
      taskResults,
    };
    const response = await httpClient.post("/tasks/progress/me", safePayload);
    return response.data;
  },

  async fetchTaskStreak() {
    const response = await httpClient.get("/streak/me");
    return response.data;
  },
};

export default taskApi;
