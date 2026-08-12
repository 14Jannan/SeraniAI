import { beforeEach, describe, expect, it, vi } from "vitest";

const User = require("../../models/userModel");
const streakController = require("../../controllers/streakController");

const USER_ID = "507f191e810c19729de860e1";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("streakController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("completeLessonAndUpdateStreak returns 404 when user not found", async () => {
    vi.spyOn(User, "findById").mockResolvedValue(null);
    const req = { user: { id: USER_ID, _id: USER_ID } };
    const res = mockRes();

    await streakController.completeLessonAndUpdateStreak(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  it("completeLessonAndUpdateStreak starts first streak", async () => {
    const user = {
      streakCount: 0,
      lastLessonCompletedAt: null,
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(User, "findById").mockResolvedValue(user);
    const req = { user: { id: USER_ID, _id: USER_ID } };
    const res = mockRes();

    await streakController.completeLessonAndUpdateStreak(req, res);

    expect(user.streakCount).toBe(1);
    expect(user.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("getMyStreak returns current streak and task streak values", async () => {
    vi.spyOn(User, "findById").mockReturnValue({
      select: vi.fn().mockResolvedValue({
        streakCount: 4,
        lastLessonCompletedAt: new Date("2026-05-11T00:00:00.000Z"),
        taskStreakCount: 2,
        lastTaskCompletedAt: new Date("2026-05-12T00:00:00.000Z"),
      }),
    });

    const req = { user: { id: USER_ID, _id: USER_ID } };
    const res = mockRes();

    await streakController.getMyStreak(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        streakCount: 4,
        taskStreakCount: 2,
      })
    );
  });
});
