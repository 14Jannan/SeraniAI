// Single source of truth for the backend base URL. Every API module and
// page should import from here instead of hardcoding "http://localhost:7001"
// - that hardcoding meant the web app could never be pointed at a staging
// or production backend without editing two dozen files.
//
// Set VITE_API_BASE_URL in a .env file to override (e.g. for staging/prod
// builds). Falls back to the local dev backend when unset.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:7001";

// Convenience helper for the common "<base>/api/<segment>" shape used by
// most of the api/*.js modules.
export const apiUrl = (path = "") =>
  `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export default API_BASE_URL;
