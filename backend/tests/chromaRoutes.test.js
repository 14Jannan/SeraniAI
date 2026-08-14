import { createRequire } from "node:module";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const ChromaDBService = require("../services/chromaDBService");
const chromaRoutes = require("../routes/chromaRoutes");

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/chroma", chromaRoutes);
  return app;
};

describe("chromaRoutes (integration)", () => {
  let app;
  let token;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test_secret";

    // `id` (not just `_id`) is what real Mongoose documents expose as a
    // virtual string alias, and it's what chromaRoutes reads - mirror that
    // here so this fake stands in for a real User document.
    vi.spyOn(User, "findById").mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: "user-1", id: "user-1", role: "user" }),
    });

    token = jwt.sign({ id: "user-1" }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    app = buildApp();
  });

  describe("POST /journal/search", () => {
    it("SECURITY: scopes the search to the authenticated user's own journals", async () => {
      const searchSpy = vi
        .spyOn(ChromaDBService.prototype, "search")
        .mockResolvedValue({ results: [] });

      await request(app)
        .post("/api/chroma/journal/search")
        .set("Authorization", `Bearer ${token}`)
        .send({ query: "how was my week" });

      expect(searchSpy).toHaveBeenCalledWith(
        "how was my week",
        "journals",
        5,
        { userId: "user-1" },
      );
    });

    it("returns 401 without a token", async () => {
      const res = await request(app)
        .post("/api/chroma/journal/search")
        .send({ query: "test" });

      expect(res.status).toBe(401);
    });

    it("returns 400 when query is missing", async () => {
      const res = await request(app)
        .post("/api/chroma/journal/search")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("POST /chat/search", () => {
    it("SECURITY: scopes the search to the authenticated user's own chat history", async () => {
      const searchSpy = vi
        .spyOn(ChromaDBService.prototype, "search")
        .mockResolvedValue({ results: [] });

      await request(app)
        .post("/api/chroma/chat/search")
        .set("Authorization", `Bearer ${token}`)
        .send({ query: "what did we discuss", nResults: 3 });

      expect(searchSpy).toHaveBeenCalledWith(
        "what did we discuss",
        "chat_messages",
        3,
        { userId: "user-1" },
      );
    });
  });

  describe("POST /course/search", () => {
    it("does not scope by userId - course content is shared platform content, not private", async () => {
      const searchSpy = vi
        .spyOn(ChromaDBService.prototype, "search")
        .mockResolvedValue({ results: [] });

      await request(app)
        .post("/api/chroma/course/search")
        .set("Authorization", `Bearer ${token}`)
        .send({ query: "mindfulness" });

      expect(searchSpy).toHaveBeenCalledWith("mindfulness", "courses", 5);
    });
  });

  describe("GET /health", () => {
    it("is publicly accessible", async () => {
      vi.spyOn(ChromaDBService.prototype, "health").mockResolvedValue({
        status: "healthy",
      });

      const res = await request(app).get("/api/chroma/health");

      expect(res.status).toBe(200);
    });
  });
});
