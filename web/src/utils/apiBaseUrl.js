// Single source of truth for the backend's base URL. Every api/* module and
// page that talks to the backend directly (instead of through httpClient)
// should import this instead of hardcoding "http://localhost:7001" - that
// hardcoded value only works when running the frontend and backend on the
// same machine in dev, and silently breaks every API call once this is
// deployed anywhere else.
//
// Set VITE_API_BASE_URL in the environment (e.g. a .env.production file, or
// your hosting provider's build-time env vars) to the real backend URL.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:7001";

export default API_BASE_URL;
