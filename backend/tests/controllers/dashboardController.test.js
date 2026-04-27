// Set env BEFORE any require so the module-level `new OpenAI(...)` fires with a key
process.env.OPENAI_API_KEY = "test-key";

jest.mock("../../models/userModel");
jest.mock("../../models/journalModel");
jest.mock("../../models/chatModels");
jest.mock("../../models/userTaskProgressModel");
jest.mock("openai");

// Require AFTER mocks are registered so the module-level openai instance
// is constructed from the jest-mocked OpenAI constructor
const OpenAI = require("openai");
const dashboardController = require("../../controllers/dashboardController");
const User = require("../../models/userModel");
const Journal = require("../../models/journalModel");
const Chat = require("../../models/chatModels");
const UserTaskProgress = require("../../models/userTaskProgressModel");

// ---------------------------------------------------------------------------
// Shared mock create fn — replaced per-test where needed
// ---------------------------------------------------------------------------
let mockCreate;

beforeAll(() => {
  mockCreate = jest.fn();
  OpenAI.mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeJournalFindChain(docs) {
  return {
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(docs),
  };
}

function makeChatFindChain(docs) {
  return {
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(docs),
  };
}

// ---------------------------------------------------------------------------
describe("Dashboard Controller", () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore a default passing mockCreate between tests
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "Weekly report text." } }],
    });

    mockReq = { user: { _id: "user123" } };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  // =========================================================================
  describe("getDashboardStats", () => {
    // -------------------------------------------------------------------------
    it("should return 404 if user not found", async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await dashboardController.getDashboardStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    // -------------------------------------------------------------------------
    it("should return 200 with aggregated dashboard stats", async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          name: "Test User",
          lessonProgress: [{}],
        }),
      });

      Journal.countDocuments.mockResolvedValue(10);

      // Journal.find is called once for recentJournals
      Journal.find.mockReturnValue(
        makeJournalFindChain([{ _id: "j1", title: "J1", createdAt: new Date() }])
      );

      // Journal.aggregate().allowDiskUse() for trends
      Journal.aggregate.mockReturnValue({
        allowDiskUse: jest.fn().mockResolvedValue([]),
      });

      UserTaskProgress.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ taskIds: ["t1", "t2"] }),
      });

      // Chat.aggregate().allowDiskUse() for AI interaction count
      Chat.aggregate.mockReturnValue({
        allowDiskUse: jest.fn().mockResolvedValue([{ _id: null, count: 5 }]),
      });

      Chat.find.mockReturnValue(
        makeChatFindChain([{ _id: "c1", title: "C1", updatedAt: new Date() }])
      );

      await dashboardController.getDashboardStats(mockReq, mockRes);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          userName: "Test User",
          stats: {
            totalJournals: 10,
            dailyTasks: 2,
            completedLessons: 1,
            aiInteractions: 5,
          },
          recentActivity: expect.any(Array),
          journalTrends: expect.any(Array),
        })
      );
    });

    // -------------------------------------------------------------------------
    it("should return dailyTasks: 0 when no task progress exists for today", async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          name: "Test User",
          lessonProgress: [],
        }),
      });

      Journal.countDocuments.mockResolvedValue(0);
      Journal.find.mockReturnValue(makeJournalFindChain([]));
      Journal.aggregate.mockReturnValue({
        allowDiskUse: jest.fn().mockResolvedValue([]),
      });

      // No task progress for today
      UserTaskProgress.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      Chat.aggregate.mockReturnValue({
        allowDiskUse: jest.fn().mockResolvedValue([]),
      });
      Chat.find.mockReturnValue(makeChatFindChain([]));

      await dashboardController.getDashboardStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stats: expect.objectContaining({ dailyTasks: 0 }),
        })
      );
    });

    // -------------------------------------------------------------------------
    it("should return 500 on server error", async () => {
      User.findById.mockImplementation(() => {
        throw new Error("DB Error");
      });

      await dashboardController.getDashboardStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Server error retrieving stats",
      });
    });
  });

  // =========================================================================
  describe("getWeeklyReport", () => {
    // -------------------------------------------------------------------------
    it("should return 200 with generated AI report", async () => {
      Journal.find.mockReturnValue(
        makeJournalFindChain([{ title: "Day 1", createdAt: new Date() }])
      );
      Chat.find.mockReturnValue(
        makeChatFindChain([{ title: "Chat 1", updatedAt: new Date() }])
      );

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "This is a weekly report." } }],
      });

      await dashboardController.getWeeklyReport(mockReq, mockRes);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        report: "This is a weekly report.",
      });
    });

    // -------------------------------------------------------------------------
    it("should still return 200 when journals and chats are empty (no-activity week)", async () => {
      // Both empty — controller builds "No journal entries / No AI chat" context
      Journal.find.mockReturnValue(makeJournalFindChain([]));
      Chat.find.mockReturnValue(makeChatFindChain([]));

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "Quiet week report." } }],
      });

      await dashboardController.getWeeklyReport(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ report: "Quiet week report." });

      // Verify the AI was still called (context sent even with no activity)
      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[1].content).toContain("No journal entries this week");
      expect(callArgs.messages[1].content).toContain("No AI chat interactions this week");
    });

    // -------------------------------------------------------------------------
    it("should return 500 when AI response has unexpected shape", async () => {
      Journal.find.mockReturnValue(
        makeJournalFindChain([{ title: "Day 1", createdAt: new Date() }])
      );
      Chat.find.mockReturnValue(makeChatFindChain([]));

      // Malformed response — content is missing
      mockCreate.mockResolvedValue({
        choices: [{ message: {} }],
      });

      await dashboardController.getWeeklyReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "AI response missing expected content",
      });
    });

    // -------------------------------------------------------------------------
    it("should return 500 on database error", async () => {
      Journal.find.mockImplementation(() => {
        throw new Error("DB Error");
      });

      await dashboardController.getWeeklyReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Server error generating report",
      });
    });
  });
});