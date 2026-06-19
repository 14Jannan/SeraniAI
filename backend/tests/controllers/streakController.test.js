jest.mock("../../models/userModel");

const streakController = require("../../controllers/streakController");
const User = require("../../models/userModel");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("streakController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById = jest.fn();
  });

  it("completeLessonAndUpdateStreak returns 404 when user not found", async () => {
    User.findById.mockResolvedValue(null);
    const req = { user: { id: "u1" } };
    const res = mockRes();

    await streakController.completeLessonAndUpdateStreak(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  it("completeLessonAndUpdateStreak starts first streak", async () => {
    const user = {
      streakCount: 0,
      lastLessonCompletedAt: null,
      save: jest.fn().mockResolvedValue(undefined),
    };
    User.findById.mockResolvedValue(user);
    const req = { user: { id: "u1" } };
    const res = mockRes();

    await streakController.completeLessonAndUpdateStreak(req, res);

    expect(user.streakCount).toBe(1);
    expect(user.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("getMyStreak returns current streak and task streak values", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        streakCount: 4,
        lastLessonCompletedAt: new Date("2026-05-11T00:00:00.000Z"),
        taskStreakCount: 2,
        lastTaskCompletedAt: new Date("2026-05-12T00:00:00.000Z"),
      }),
    });

    const req = { user: { id: "u1" } };
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
