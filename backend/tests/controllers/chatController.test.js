const chatController = require("../../controllers/chatControllers");
const Chat = require("../../models/chatModels");
const Journal = require("../../models/journalModel");
const User = require("../../models/userModel");
const Course = require("../../models/courseModel");
const Lesson = require("../../models/lessonModel");
const UserTaskProgress = require("../../models/userTaskProgressModel");
const ChromaDBService = require("../../services/chromaDBService");
const { saveJournalEntry } = require("../../utils/journalUtils");
const OpenAI = require("openai");

jest.mock("../../models/chatModels");
jest.mock("../../models/journalModel");
jest.mock("../../models/userModel");
jest.mock("../../models/courseModel");
jest.mock("../../models/lessonModel");
jest.mock("../../models/userTaskProgressModel");
jest.mock("../../services/chromaDBService");
jest.mock("../../utils/journalUtils");
jest.mock("openai");
jest.mock("pdf-parse");
jest.mock("fs");

describe("Chat Controller", () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      user: { _id: "user123", name: "Test User" },
      body: {},
      params: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe("sendMessage", () => {
    it("should return 401 if user is not authorized", async () => {
      mockReq.user = undefined;
      await chatController.sendMessage(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Not authorized" });
    });

    it("should return 400 if message and file are missing", async () => {
      await chatController.sendMessage(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Message or file is required" });
    });

    it("should process message and return 200 on success", async () => {
      mockReq.body.message = "Hello AI";
      
      const mockChat = {
        _id: "chat123",
        messages: [],
        save: jest.fn().mockResolvedValue(true)
      };
      Chat.create.mockResolvedValue(mockChat);
      
      const mockUser = { _id: "user123", lessonProgress: [], lastLessonCompletedAt: null };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
        // Make the mock itself awaitable for the unchained call
        then: (resolve) => resolve(mockUser),
      });
      Journal.find.mockResolvedValue([]);
      
      ChromaDBService.prototype.search.mockResolvedValue({ results: [] });
      ChromaDBService.prototype.addEmbedding.mockResolvedValue(true);
      
      const mockOpenAICreate = jest.fn().mockResolvedValue({
        choices: [{ message: { content: "Hello User", role: "assistant" } }]
      });
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockOpenAICreate } }
      }));
      
      // Mock isFirstChatOfDay
      Chat.countDocuments.mockResolvedValue(1); // not first chat

      await chatController.sendMessage(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        reply: "Hello User",
        sessionId: "chat123"
      }));
    });
  });

  describe("getHistory", () => {
    it("should return 401 if user is not authorized", async () => {
      mockReq.user = undefined;
      await chatController.getHistory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it("should return 200 with chat history", async () => {
      const mockChats = [{ _id: "chat1" }, { _id: "chat2" }];
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockChats)
      };
      Chat.find.mockReturnValue(mockQuery);

      await chatController.getHistory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockChats);
    });
  });

  describe("getSession", () => {
    it("should return 404 if chat session not found", async () => {
      mockReq.params.id = "invalid123";
      Chat.findOne.mockResolvedValue(null);

      await chatController.getSession(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Chat session not found" });
    });

    it("should return 200 with chat session data", async () => {
      mockReq.params.id = "chat123";
      const mockChat = { _id: "chat123", messages: [] };
      Chat.findOne.mockResolvedValue(mockChat);

      await chatController.getSession(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockChat);
    });
  });

  describe("deleteSession", () => {
    it("should return 200 and delete chat session", async () => {
      mockReq.params.id = "chat123";
      Chat.findOneAndDelete.mockResolvedValue({ _id: "chat123" });

      await chatController.deleteSession(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Chat deleted" });
    });
  });

  describe("clearHistory", () => {
    it("should return 200 and delete all user chats", async () => {
      Chat.deleteMany.mockResolvedValue({ deletedCount: 5 });

      await chatController.clearHistory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "All chat history cleared" });
    });
  });
});
