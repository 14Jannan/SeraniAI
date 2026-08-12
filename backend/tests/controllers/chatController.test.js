process.env.OPENAI_API_KEY = "test-key";

import { beforeEach, describe, expect, it, vi } from "vitest";

const Chat = require("../../models/chatModels");
const Journal = require("../../models/journalModel");
const User = require("../../models/userModel");
const Lesson = require("../../models/lessonModel");
const ChromaDBService = require("../../services/chromaDBService");
const chatController = require("../../controllers/chatControllers");

const USER_ID = "507f191e810c19729de860e1";
const CHAT_ID = "507f191e810c19729de860e2";

function makeThenableMock(resolvedValue) {
  const mock = {
    select: vi.fn().mockReturnThis(),
    then: (resolve, reject) => {
      try {
        resolve(resolvedValue);
      } catch (err) {
        reject(err);
      }
    },
  };
  mock.select = vi.fn().mockReturnValue(mock);
  return mock;
}

function makeJournalFindChain(docs) {
  return {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(docs),
  };
}

function makeCourseLessonFindChain(docs) {
  return {
    sort: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(docs),
  };
}

describe("Chat Controller", () => {
  let mockReq, mockRes;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    mockReq = {
      user: { _id: USER_ID, name: "Test User" },
      body: {},
      params: {},
      file: null,
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
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
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Message or file is required",
      });
    });

    it("should return 404 when sessionId provided but session not found", async () => {
      mockReq.body.message = "Try to continue";
      mockReq.body.sessionId = CHAT_ID;

      vi.spyOn(Chat, "findOne").mockResolvedValue(null);

      await chatController.sendMessage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Chat session not found",
      });
    });

    it("should return 500 on unexpected server error", async () => {
      mockReq.body.message = "Test";

      vi.spyOn(Chat, "create").mockImplementation(() => {
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

  describe("getHistory", () => {
    it("should return 401 if user is not authorized", async () => {
      mockReq.user = undefined;
      await chatController.getHistory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Not authorized" });
    });

    it("should return 200 with chat history", async () => {
      const mockChats = [
        { _id: CHAT_ID, title: "Chat 1", updatedAt: new Date() },
      ];
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockResolvedValue(mockChats),
      };
      vi.spyOn(Chat, "find").mockReturnValue(mockQuery);

      await chatController.getHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockChats);
    });
  });

  describe("deleteSession", () => {
    it("should return 401 if user is not authorized", async () => {
      mockReq.user = undefined;
      await chatController.deleteSession(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it("should return 404 if chat session not found", async () => {
      mockReq.params.id = CHAT_ID;
      vi.spyOn(Chat, "findOneAndDelete").mockResolvedValue(null);

      await chatController.deleteSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Chat session not found",
      });
    });

    it("should return 200 and delete chat session", async () => {
      mockReq.params.id = CHAT_ID;
      vi.spyOn(Chat, "findOneAndDelete").mockResolvedValue({ _id: CHAT_ID });

      await chatController.deleteSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Chat deleted" });
      expect(Chat.findOneAndDelete).toHaveBeenCalledWith({
        _id: CHAT_ID,
        user: USER_ID,
      });
    });
  });

  describe("clearHistory", () => {
    it("should return 401 if user is not authorized", async () => {
      mockReq.user = undefined;
      await chatController.clearHistory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it("should return 200 and delete all user chats", async () => {
      vi.spyOn(Chat, "deleteMany").mockResolvedValue({ deletedCount: 3 });

      await chatController.clearHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "All chat history cleared" });
    });
  });
});