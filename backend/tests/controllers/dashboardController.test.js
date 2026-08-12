process.env.OPENAI_API_KEY = "test-key";

import { beforeEach, describe, expect, it, vi } from "vitest";

const User = require("../../models/userModel");
const Journal = require("../../models/journalModel");
const Chat = require("../../models/chatModels");
const UserTaskProgress = require("../../models/userTaskProgressModel");
const Lesson = require("../../models/lessonModel");
const dashboardController = require("../../controllers/dashboardController");

const USER_ID = "507f191e810c19729de860e1";

function makeQueryMock(resolvedValue) {
  const mock = {
    select: vi.fn(),
    sort: vi.fn(),
    limit: vi.fn(),
    lean: vi.fn(),
    populate: vi.fn(),
    allowDiskUse: vi.fn(),
    then: (resolve) => resolve(resolvedValue),
  };
  mock.select.mockReturnValue(mock);
  mock.sort.mockReturnValue(mock);
  mock.limit.mockReturnValue(mock);
  mock.lean.mockReturnValue(mock);
  mock.populate.mockReturnValue(mock);
  mock.allowDiskUse.mockReturnValue(mock);
  return mock;
}

describe("Dashboard Controller", () => {
  let mockReq, mockRes;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    mockReq = { user: { _id: USER_ID } };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  describe("getDashboardStats", () => {
    it("should return 404 if user not found", async () => {
      vi.spyOn(User, "findById").mockReturnValue(makeQueryMock(null));

      await dashboardController.getDashboardStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("should return 200 with aggregated dashboard stats", async () => {
      vi.spyOn(User, "findById").mockReturnValue(
        makeQueryMock({
          name: "Test User",
          lessonProgress: [],
        })
      );

      vi.spyOn(Journal, "countDocuments").mockResolvedValue(10);
      vi.spyOn(Journal, "find").mockReturnValue(
        makeQueryMock([{ _id: "j1", title: "J1", createdAt: new Date() }])
      );
      vi.spyOn(Journal, "findOne").mockReturnValue(makeQueryMock(null));
      vi.spyOn(Journal, "aggregate").mockReturnValue(makeQueryMock([]));

      vi.spyOn(UserTaskProgress, "findOne").mockReturnValue(
        makeQueryMock({ taskIds: ["t1", "t2"] })
      );
      vi.spyOn(Chat, "aggregate").mockReturnValue(makeQueryMock([{ _id: null, count: 5 }]));
      vi.spyOn(Chat, "find").mockReturnValue(
        makeQueryMock([{ _id: "c1", title: "C1", updatedAt: new Date() }])
      );
      vi.spyOn(Lesson, "find").mockReturnValue(makeQueryMock([]));
      vi.spyOn(Lesson, "findOne").mockReturnValue(makeQueryMock(null));

      await dashboardController.getDashboardStats(mockReq, mockRes);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          userName: "Test User",
          stats: {
            totalJournals: 10,
            dailyTasks: 2,
            completedLessons: 0,
            aiInteractions: 5,
          },
          recentActivity: expect.any(Array),
        })
      );
    });

    it("should return dailyTasks: 0 when no task progress exists for today", async () => {
      vi.spyOn(User, "findById").mockReturnValue(
        makeQueryMock({
          name: "Test User",
          lessonProgress: [],
        })
      );

      vi.spyOn(Journal, "countDocuments").mockResolvedValue(0);
      vi.spyOn(Journal, "find").mockReturnValue(makeQueryMock([]));
      vi.spyOn(Journal, "findOne").mockReturnValue(makeQueryMock(null));
      vi.spyOn(Journal, "aggregate").mockReturnValue(makeQueryMock([]));
      vi.spyOn(UserTaskProgress, "findOne").mockReturnValue(makeQueryMock(null));
      vi.spyOn(Chat, "aggregate").mockReturnValue(makeQueryMock([]));
      vi.spyOn(Chat, "find").mockReturnValue(makeQueryMock([]));
      vi.spyOn(Lesson, "find").mockReturnValue(makeQueryMock([]));
      vi.spyOn(Lesson, "findOne").mockReturnValue(makeQueryMock(null));

      await dashboardController.getDashboardStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stats: expect.objectContaining({ dailyTasks: 0 }),
        })
      );
    });

    it("should return 500 on server error", async () => {
      vi.spyOn(User, "findById").mockImplementation(() => {
        throw new Error("DB Error");
      });

      await dashboardController.getDashboardStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Server error retrieving stats",
      });
    });
  });
});