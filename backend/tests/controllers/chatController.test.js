// Set env BEFORE any require so the module-level `new OpenAI(...)` fires with a key
process.env.OPENAI_API_KEY = "test-key";

jest.mock("../../models/chatModels");
jest.mock("../../models/journalModel");
jest.mock("../../models/userModel");
jest.mock("../../models/enrollmentModel"); // Bug 4 fix: mock unused model
jest.mock("../../models/courseModel");
jest.mock("../../models/lessonModel");
jest.mock("../../models/userTaskProgressModel");
jest.mock("../../services/chromaDBService");
jest.mock("../../utils/journalUtils");
jest.mock("../../utils/promptBuilder", () => ({
  generateSystemPrompt: jest.fn().mockReturnValue("Mock system prompt"),
})); // Bug 2 fix: mock promptBuilder

// Create a shared mock state that can be updated per test
const mockState = {
  createFn: jest.fn(),
};

jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args) => mockState.createFn(...args),
      },
    },
  }));
});

jest.mock("pdf-parse");
jest.mock("fs");

// Require AFTER mocks are registered
const OpenAI = require("openai");
const chatController = require("../../controllers/chatControllers");
const Chat = require("../../models/chatModels");
const Journal = require("../../models/journalModel");
const User = require("../../models/userModel");
const Course = require("../../models/courseModel");
const Lesson = require("../../models/lessonModel");
const UserTaskProgress = require("../../models/userTaskProgressModel");
const ChromaDBService = require("../../services/chromaDBService");
const { saveJournalEntry } = require("../../utils/journalUtils");

let mockOpenAICreate;

beforeAll(() => {
  mockOpenAICreate = mockState.createFn;
});

// ---------------------------------------------------------------------------
// Helper: Create a thenable mock that works for both chained and unchained calls
// Bug 3 fix: User.findById is called with .select() and without
// ---------------------------------------------------------------------------
function makeThenableMock(resolvedValue) {
  const mock = {
    then: (resolve, reject) => {
      try {
        resolve(resolvedValue);
      } catch (err) {
        reject(err);
      }
    },
  };
  // Add select method after mock is defined
  mock.select = jest.fn().mockReturnValue(mock);
  return mock;
}

function makeJournalFindChain(docs) {
  return {
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(docs),
  };
}

function makeCourseLessonFindChain(docs) {
  return {
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(docs),
  };
}

// ---------------------------------------------------------------------------
describe("Chat Controller", () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: "Hello User", role: "assistant" } }],
    });

    mockReq = {
      user: { _id: "user123", name: "Test User" },
      body: {},
      params: {},
      file: null,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  // =========================================================================
  describe("sendMessage", () => {
    // -------------------------------------------------------------------------
    it("should return 401 if user is not authorized", async () => {
      mockReq.user = undefined;
      await chatController.sendMessage(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Not authorized" });
    });

    // -------------------------------------------------------------------------
    it("should return 400 if message and file are missing", async () => {
      await chatController.sendMessage(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Message or file is required",
      });
    });

    // -------------------------------------------------------------------------
    it("should create new chat and return 200 on success with message only", async () => {
      mockReq.body.message = "Hello AI";

      const mockChat = {
        _id: "chat123",
        messages: [],
        save: jest.fn().mockResolvedValue(true),
      };
      Chat.create.mockResolvedValue(mockChat);

      const mockUser = {
        _id: "user123",
        lessonProgress: [],
        lastLessonCompletedAt: null,
      };
      User.findById.mockReturnValue(makeThenableMock(mockUser));

      Journal.find.mockResolvedValue([]);
      Lesson.find.mockReturnValue(
        makeCourseLessonFindChain([])
      );

      ChromaDBService.prototype.search.mockResolvedValue({ results: [] });
      ChromaDBService.prototype.addEmbedding.mockResolvedValue(true);

      Chat.countDocuments.mockResolvedValue(1); // not first chat

      await chatController.sendMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          reply: "Hello User",
          sessionId: "chat123",
          courses: expect.any(Array),
        })
      );

      // Verify chat was created
      expect(Chat.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: "user123",
          title: "Hello AI",
          messages: [],
        })
      );
    });

    // -------------------------------------------------------------------------
    it("should use existing session when sessionId is provided and session exists", async () => {
      mockReq.body.message = "Continue chat";
      mockReq.body.sessionId = "existing123";

      const mockChat = {
        _id: "existing123",
        user: "user123",
        messages: [{ role: "user", content: "Earlier message" }],
        save: jest.fn().mockResolvedValue(true),
      };
      Chat.findOne.mockResolvedValue(mockChat);

      const mockUser = {
        _id: "user123",
        lessonProgress: [],
        lastLessonCompletedAt: null,
      };
      User.findById.mockReturnValue(makeThenableMock(mockUser));

      Journal.find.mockResolvedValue([]);
      Lesson.find.mockReturnValue(makeCourseLessonFindChain([]));
      ChromaDBService.prototype.search.mockResolvedValue({ results: [] });
      ChromaDBService.prototype.addEmbedding.mockResolvedValue(true);

      Chat.countDocuments.mockResolvedValue(1);

      await chatController.sendMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(Chat.findOne).toHaveBeenCalledWith({
        _id: "existing123",
        user: "user123",
      });
      expect(Chat.create).not.toHaveBeenCalled();
    });

    // -------------------------------------------------------------------------
    it("should return 404 when sessionId provided but session not found", async () => {
      mockReq.body.message = "Try to continue";
      mockReq.body.sessionId = "nonexistent123";

      Chat.findOne.mockResolvedValue(null);

      await chatController.sendMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Chat session not found",
      });
    });

    // -------------------------------------------------------------------------
    it("should handle edit mode by truncating messages", async () => {
      mockReq.body.message = "Edited message";
      mockReq.body.sessionId = "edit123";
      mockReq.body.editIndex = 2; // Keep only messages 0 and 1

      const mockChat = {
        _id: "edit123",
        user: "user123",
        messages: [
          { role: "user", content: "msg1" },
          { role: "assistant", content: "reply1" },
          { role: "user", content: "msg2" },
          { role: "assistant", content: "reply2" },
        ],
        save: jest.fn().mockResolvedValue(true),
      };
      Chat.findOne.mockResolvedValue(mockChat);

      const mockUser = {
        _id: "user123",
        lessonProgress: [],
        lastLessonCompletedAt: null,
      };
      User.findById.mockReturnValue(makeThenableMock(mockUser));

      Journal.find.mockResolvedValue([]);
      Lesson.find.mockReturnValue(makeCourseLessonFindChain([]));
      ChromaDBService.prototype.search.mockResolvedValue({ results: [] });
      ChromaDBService.prototype.addEmbedding.mockResolvedValue(true);
      Chat.countDocuments.mockResolvedValue(1);

      await chatController.sendMessage(mockReq, mockRes);

      // Verify messages were truncated to index 2
      expect(mockChat.messages.length).toBeLessThanOrEqual(4); // 2 original + 2 new (user + assistant)
    });

    // -------------------------------------------------------------------------
    it("should handle first chat of the day and add daily reminders", async () => {
      mockReq.body.message = "Hello";

      const mockChat = {
        _id: "chat123",
        messages: [],
        save: jest.fn().mockResolvedValue(true),
      };
      Chat.create.mockResolvedValue(mockChat);

      const mockUser = {
        _id: "user123",
        lessonProgress: [{ lessonId: "lesson1", updatedAt: new Date() }],
        lastLessonCompletedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
      };
      User.findById.mockReturnValue(makeThenableMock(mockUser));

      Journal.find.mockResolvedValue([]);
      Journal.findOne.mockResolvedValue(null); // No journal today
      Lesson.find.mockReturnValue({
        distinct: jest.fn().mockResolvedValue(["course1"]),
      });
      UserTaskProgress.findOne.mockResolvedValue(null);

      ChromaDBService.prototype.search.mockResolvedValue({ results: [] });
      ChromaDBService.prototype.addEmbedding.mockResolvedValue(true);

      Chat.countDocuments.mockResolvedValue(0); // First chat!

      await chatController.sendMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const responseCall = mockRes.json.mock.calls[0][0];
      // Reminders should be in the reply
      expect(responseCall.reply).toContain("DAILY REMINDER");
    });

    // -------------------------------------------------------------------------
    it("should return 500 on unexpected server error", async () => {
      mockReq.body.message = "Test";

      Chat.create.mockImplementation(() => {
        throw new Error("DB Error");
      });

      await chatController.sendMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Server error",
        })
      );
    });
  });

  // =========================================================================
  describe("getHistory", () => {
    // -------------------------------------------------------------------------
    it("should return 401 if user is not authorized", async () => {
      mockReq.user = undefined;
      await chatController.getHistory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Not authorized" });
    });

    // -------------------------------------------------------------------------
    it("should return 200 with chat history", async () => {
      const mockChats = [
        { _id: "chat1", title: "Chat 1", updatedAt: new Date() },
        { _id: "chat2", title: "Chat 2", updatedAt: new Date() },
      ];
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockChats),
      };
      Chat.find.mockReturnValue(mockQuery);

      await chatController.getHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockChats);
      expect(Chat.find).toHaveBeenCalledWith({ user: "user123" });
    });

    // -------------------------------------------------------------------------
    it("should return 500 on database error", async () => {
      Chat.find.mockImplementation(() => {
        throw new Error("DB Error");
      });

      await chatController.getHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Server error" });
    });
  });

  // =========================================================================
  describe("getSession", () => {
    // -------------------------------------------------------------------------
    it("should return 401 if user is not authorized", async () => {
      mockReq.user = undefined;
      mockReq.params.id = "chat123";

      await chatController.getSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Not authorized" });
    });

    // -------------------------------------------------------------------------
    it("should return 404 if chat session not found", async () => {
      mockReq.params.id = "invalid123";
      Chat.findOne.mockResolvedValue(null);

      await chatController.getSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Chat session not found",
      });
      expect(Chat.findOne).toHaveBeenCalledWith({
        _id: "invalid123",
        user: "user123",
      });
    });

    // -------------------------------------------------------------------------
    it("should return 200 with chat session data", async () => {
      mockReq.params.id = "chat123";
      const mockChat = {
        _id: "chat123",
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there" },
        ],
      };
      Chat.findOne.mockResolvedValue(mockChat);

      await chatController.getSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockChat);
    });

    // -------------------------------------------------------------------------
    it("should return 500 on database error", async () => {
      mockReq.params.id = "chat123";
      Chat.findOne.mockImplementation(() => {
        throw new Error("DB Error");
      });

      await chatController.getSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Server error" });
    });
  });

  // =========================================================================
  describe("deleteSession", () => {
    // -------------------------------------------------------------------------
    it("should return 401 if user is not authorized", async () => {
      mockReq.user = undefined;
      mockReq.params.id = "chat123";

      await chatController.deleteSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Not authorized" });
    });

    // -------------------------------------------------------------------------
    it("should return 404 if chat session not found", async () => {
      mockReq.params.id = "invalid123";
      Chat.findOneAndDelete.mockResolvedValue(null);

      await chatController.deleteSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Chat session not found",
      });
    });

    // -------------------------------------------------------------------------
    it("should return 200 and delete chat session", async () => {
      mockReq.params.id = "chat123";
      Chat.findOneAndDelete.mockResolvedValue({ _id: "chat123" });

      await chatController.deleteSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Chat deleted" });
      expect(Chat.findOneAndDelete).toHaveBeenCalledWith({
        _id: "chat123",
        user: "user123",
      });
    });

    // -------------------------------------------------------------------------
    it("should return 500 on database error", async () => {
      mockReq.params.id = "chat123";
      Chat.findOneAndDelete.mockImplementation(() => {
        throw new Error("DB Error");
      });

      await chatController.deleteSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Server error" });
    });
  });

  // =========================================================================
  describe("clearHistory", () => {
    // -------------------------------------------------------------------------
    it("should return 401 if user is not authorized", async () => {
      mockReq.user = undefined;

      await chatController.clearHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Not authorized" });
    });

    // -------------------------------------------------------------------------
    it("should return 200 and delete all user chats", async () => {
      Chat.deleteMany.mockResolvedValue({ deletedCount: 5 });

      await chatController.clearHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "All chat history cleared",
      });
      expect(Chat.deleteMany).toHaveBeenCalledWith({ user: "user123" });
    });

    // -------------------------------------------------------------------------
    it("should return 500 on database error", async () => {
      Chat.deleteMany.mockImplementation(() => {
        throw new Error("DB Error");
      });

      await chatController.clearHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Server error" });
    });
  });
});