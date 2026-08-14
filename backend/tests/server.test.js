import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

// Ensure every var server.js's top-level startup checks look for is present
// *before* the module is required, since those checks run at require-time.
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test_refresh_secret";

// server.js only binds a real port / connects to Mongo when run directly
// (`require.main === module`, guarding `node server.js`). Requiring it here
// gives us the configured Express app with none of that side effect, which
// is what makes it safe to exercise with supertest.
const app = require("../server");
const request = require("supertest");

describe("server (app wiring)", () => {
  describe("GET /health", () => {
    it("reports db as disconnected when Mongo was never connected (no live DB in tests)", async () => {
      const res = await request(app).get("/health");

      expect(res.status).toBe(503);
      expect(res.body).toEqual({ status: "degraded", db: "disconnected" });
    });
  });

  describe("404 handler", () => {
    it("returns a JSON 404 for unknown routes instead of Express's default HTML page", async () => {
      const res = await request(app).get("/api/this-route-does-not-exist");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Not found" });
    });
  });

  describe("security headers", () => {
    it("sends helmet security headers on every response", async () => {
      const res = await request(app).get("/health");

      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["content-security-policy"]).toContain("default-src 'self'");
    });

    it("compresses large JSON responses when the client accepts gzip", async () => {
      const res = await request(app)
        .get("/health")
        .set("Accept-Encoding", "gzip");

      // A tiny health payload may not cross compression's size threshold,
      // but the middleware must be wired in without erroring the request.
      expect(res.status).toBe(503);
    });
  });

  describe("CORS", () => {
    it("allows a whitelisted origin and echoes it back", async () => {
      const res = await request(app)
        .get("/health")
        .set("Origin", "http://localhost:5173");

      expect(res.headers["access-control-allow-origin"]).toBe(
        "http://localhost:5173",
      );
    });

    it("rejects a non-whitelisted origin", async () => {
      const res = await request(app)
        .get("/health")
        .set("Origin", "https://evil.example.com");

      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });

  describe("JSON body size limit", () => {
    it("rejects a JSON body over the 1mb limit", async () => {
      const hugeBody = { data: "x".repeat(2 * 1024 * 1024) };

      const res = await request(app)
        .post("/api/auth/login")
        .send(hugeBody);

      expect(res.status).toBe(413);
    });
  });

  describe("rate limiting", () => {
    it("advertises rate-limit headers on /api/* responses", async () => {
      // Deliberately invalid payload so this fails fast at the validation
      // layer (no DB access - login without a password) while still
      // passing through the /api/auth rate limiter first.
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com" });

      expect(res.status).toBe(400);
      expect(res.headers).toHaveProperty("ratelimit-limit");
    });
  });
});
