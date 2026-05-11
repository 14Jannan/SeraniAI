import httpClient from "./httpClient";
import { getApiBaseUrl } from "./baseUrl";

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
  async getCourses() {
    const response = await httpClient.get("/courses");
    return response.data;
  },

  async enrollInCourse(courseId) {
    const safeCourseId = ensureValidId(courseId, "Course ID");
    const response = await httpClient.post(`/courses/${safeCourseId}/enroll`);
    return response.data;
  },

  async getLessonsByCourse(courseId) {
    const safeCourseId = ensureValidId(courseId, "Course ID");
    const response = await httpClient.get(`/lessons/course/${safeCourseId}`);
    return response.data;
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
    return response.data;
  },

  getFileUrl(path) {
    if (!path) return "";

    const root = API_BASE.replace(/\/api$/, "");
    const normalizedPath = String(path).trim();

    if (/^https?:\/\//i.test(normalizedPath)) {
      // Replace localhost URLs so physical devices can load media from LAN host.
      return normalizedPath.replace(
        /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0):\d+/i,
        root,
      );
    }

    return `${root}/${normalizedPath.replace(/^\/+/, "")}`;
  },
};

export default courseApi;
