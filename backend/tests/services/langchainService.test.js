import { beforeEach, describe, expect, it, vi } from "vitest";

const { RunnableSequence } = require("@langchain/core/runnables");
const ChromaDBService = require("../../services/chromaDBService");
const langchainService = require("../../services/langchainService");

const mockInvoke = vi.fn();

describe("langchainService unit tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    langchainService.model = {
      invoke: mockInvoke,
    };
  });

  it("executes RAG query and returns generated AI response", async () => {
    mockInvoke.mockResolvedValue("AI generated answer");
    vi.spyOn(ChromaDBService.prototype, "search").mockResolvedValue({
      results: [{ document: "Retrieved content", metadata: {} }],
    });

    vi.spyOn(RunnableSequence, "from").mockReturnValue({
      invoke: mockInvoke,
    });

    const history = [{ role: "user", content: "Hi" }];
    const user = { name: "Alice" };

    const result = await langchainService.executeRagQuery(
      "507f191e810c19729de860e1",
      "What is my goal?",
      history,
      user,
      "general",
      false,
      "2026-08-12"
    );

    expect(result).toBe("AI generated answer");
    expect(mockInvoke).toHaveBeenCalled();
  });

  it("throws error if chain execution fails", async () => {
    vi.spyOn(ChromaDBService.prototype, "search").mockResolvedValue({
      results: [],
    });

    vi.spyOn(RunnableSequence, "from").mockReturnValue({
      invoke: vi.fn().mockRejectedValue(new Error("LLM failure")),
    });

    await expect(
      langchainService.executeRagQuery("507f191e810c19729de860e1", "Fail prompt", [], { name: "Bob" })
    ).rejects.toThrow("LLM failure");
  });
});
