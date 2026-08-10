import httpClient from "./httpClient";
import { getApiBaseUrl } from "./baseUrl";
import { getWithCache, invalidateCache } from "../utils/apiCache";

const API_BASE = getApiBaseUrl();

const ensureValidId = (value, label) => {
  const id = String(value || "").trim();
  if (!id) {
    throw new Error(`${label} is required`);
  }
  return id;
};

const sanitizeNotesPayload = (payload = {}) => {
  const notes = typeof payload.notes === "string" ? payload.notes.trim() : "";
  const journal = typeof payload.journal === "string" ? payload.journal.trim() : "";

  if (notes.length > 5000 || journal.length > 5000) {
    throw new Error("Notes and journal entries must be 5000 characters or less");
  }

  return { notes, journal };
};

const courseApi = {
  async getCourses({ forceRefresh = false } = {}) {
    return getWithCache(
      "courses:list",
      () => httpClient.get("/courses").then((r) => r.data),
      { maxAgeMs: 10 * 60 * 1000, forceRefresh },
    );
  },

  async enrollInCourse(courseId) {
    const safeCourseId = ensureValidId(courseId, "Course ID");
    const response = await httpClient.post(`/courses/${safeCourseId}/enroll`);
    await invalidateCache("courses:list");
    return response.data;
  },

  async getLessonsByCourse(courseId, { forceRefresh = false } = {}) {
    const safeCourseId = ensureValidId(courseId, "Course ID");
    return getWithCache(
      `lessons:course:${safeCourseId}`,
      () => httpClient.get(`/lessons/course/${safeCourseId}`).then((r) => r.data),
      { maxAgeMs: 10 * 60 * 1000, forceRefresh },
    );
  },

  async getLessonPersonalNotes(lessonId) {
    const safeLessonId = ensureValidId(lessonId, "Lesson ID");
    const response = await httpClient.get(`/lessons/${safeLessonId}/personal-notes`);
    return response.data;
  },

  async saveLessonPersonalNotes(lessonId, payload) {
    const safeLessonId = ensureValidId(lessonId, "Lesson ID");
    const safePayload = sanitizeNotesPayload(payload);
    const response = await httpClient.put(
      `/lessons/${safeLessonId}/personal-notes`,
      safePayload,
    );
    return response.data;
  },

  async markLessonCompleteForStreak(lessonId) {
    const safeLessonId = ensureValidId(lessonId, "Lesson ID");
    const response = await httpClient.post("/streak/complete-lesson", {
      lessonId: safeLessonId,
    });
    await invalidateCache("courses:list");
    return response.data;
  },

  getFileUrl(path) {
    if (!path) return "";

    const root = API_BASE.replace(/\/api$/, "");
    const normalizedPath = String(path).trim();

    if (/^https?:\/\//i.test(normalizedPath)) {
      return normalizedPath.replace(
        /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0):\d+/i,
        root,
      );
    }

    return `${root}/${normalizedPath.replace(/^\/+/, "")}`;
  },
};

export default courseApi;