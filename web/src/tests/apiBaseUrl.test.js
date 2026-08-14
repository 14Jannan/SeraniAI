import { describe, expect, it } from "vitest";
import { API_BASE_URL } from "../utils/apiBaseUrl";

describe("apiBaseUrl", () => {
  it("falls back to localhost:7001 when VITE_API_BASE_URL is not set (test/dev env)", () => {
    // In the test environment VITE_API_BASE_URL is intentionally unset, so
    // this locks in the documented fallback behavior every api/* module
    // and page relies on.
    expect(API_BASE_URL).toBe("http://localhost:7001");
  });

  it("is a non-empty string with no trailing slash", () => {
    expect(typeof API_BASE_URL).toBe("string");
    expect(API_BASE_URL.length).toBeGreaterThan(0);
    expect(API_BASE_URL.endsWith("/")).toBe(false);
  });
});
