import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const axios = require("axios");
const ChromaDBService = require("../../services/chromaDBService");

describe("ChromaDBService unit tests", () => {
  let service;
  let mockClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
    };

    service = new ChromaDBService("http://localhost:5000");
    service.client = mockClient;
  });

  it("normalizes base URL properly", () => {
    expect(service.normalizeBaseUrl("http://localhost:5000")).toBe("http://localhost:5000/api");
    expect(service.normalizeBaseUrl("http://localhost:5000/api")).toBe("http://localhost:5000/api");
  });

  it("health() calls /health and returns data", async () => {
    mockClient.get.mockResolvedValue({ data: { status: "ok" } });
    const result = await service.health();
    expect(mockClient.get).toHaveBeenCalledWith("/health");
    expect(result).toEqual({ status: "ok" });
  });

  it("addEmbedding() posts payload to /embed", async () => {
    mockClient.post.mockResolvedValue({ data: { id: "doc-123" } });
    const id = await service.addEmbedding("sample text", "journals", { userId: "u1" });
    expect(mockClient.post).toHaveBeenCalledWith("/embed", {
      text: "sample text",
      collection: "journals",
      metadata: { userId: "u1" },
    });
    expect(id).toBe("doc-123");
  });

  it("search() posts payload to /search", async () => {
    mockClient.post.mockResolvedValue({ data: { results: [{ document: "text" }] } });
    const res = await service.search("query string", "journals", 3, { userId: "u1" });
    expect(mockClient.post).toHaveBeenCalledWith("/search", {
      query: "query string",
      collection: "journals",
      n_results: 3,
      where: { userId: "u1" },
    });
    expect(res).toEqual({ results: [{ document: "text" }] });
  });

  it("deleteEmbeddings() posts payload to /delete", async () => {
    mockClient.post.mockResolvedValue({ data: { status: "deleted" } });
    const ok = await service.deleteEmbeddings("journals", ["doc-1"]);
    expect(mockClient.post).toHaveBeenCalledWith("/delete", {
      collection: "journals",
      ids: ["doc-1"],
    });
    expect(ok).toBe(true);
  });

  it("throws error when API fails", async () => {
    mockClient.get.mockRejectedValue(new Error("Network Error"));
    await expect(service.health()).rejects.toThrow("ChromaDB health check failed: Network Error");
  });

  describe("internal service authentication", () => {
    const ORIGINAL_KEY = process.env.CHROMA_SERVICE_API_KEY;

    afterEach(() => {
      if (ORIGINAL_KEY === undefined) {
        delete process.env.CHROMA_SERVICE_API_KEY;
      } else {
        process.env.CHROMA_SERVICE_API_KEY = ORIGINAL_KEY;
      }
    });

    it("attaches the X-Internal-Api-Key header when CHROMA_SERVICE_API_KEY is set", () => {
      process.env.CHROMA_SERVICE_API_KEY = "shared-secret";
      const createSpy = vi.spyOn(axios, "create");

      new ChromaDBService("http://localhost:5000");

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { "X-Internal-Api-Key": "shared-secret" },
        }),
      );
    });

    it("omits the auth header when CHROMA_SERVICE_API_KEY is unset (local dev)", () => {
      delete process.env.CHROMA_SERVICE_API_KEY;
      const createSpy = vi.spyOn(axios, "create");

      new ChromaDBService("http://localhost:5000");

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ headers: {} }),
      );
    });
  });
});
