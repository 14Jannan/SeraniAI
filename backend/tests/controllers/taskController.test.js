cd jest.mock("../../models/taskModel", () => ({
  Task: {
    countDocuments: jest.fn(),
    insertMany: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndDelete: jest.fn(),
    aggregate: jest.fn(),
  },
}));

jest.mock("../../models/userTaskProgressModel", () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock("../../models/userModel", () => ({
  findById: jest.fn(),
}));

jest.mock("../../utils/defaultTasks", () => [{ taskId: "t1", title: "Default" }]);

const taskController = require("../../controllers/taskController");
const { Task } = require("../../models/taskModel");
const UserTaskProgress = require("../../models/userTaskProgressModel");
const User = require("../../models/userModel");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("taskController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getTasks returns filtered tasks", async () => {
    Task.countDocuments.mockResolvedValue(1);
    Task.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([{ taskId: "t1" }]) });

    const req = { query: { activeOnly: "true", category: "Focus", q: "Breath" } };
    const res = mockRes();

    await taskController.getTasks(req, res);

    expect(Task.find).toHaveBeenCalledWith({
      isActive: true,
      category: "Focus",
      title: { $regex: "Breath", $options: "i" },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("createTask returns 400 for missing required fields", async () => {
    const res = mockRes();

    await taskController.createTask({ body: { title: "Only Title" } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("createTask returns 409 when task id exists", async () => {
    Task.findOne.mockResolvedValue({ taskId: "t1" });
    const req = {
      body: { taskId: "t1", title: "Task", category: "Focus", duration: "5m", type: "timer" },
    };
    const res = mockRes();

    await taskController.createTask(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("getDailyTasks reuses existing progress assignment", async () => {
    Task.countDocuments.mockResolvedValue(4);
    UserTaskProgress.findOne.mockResolvedValue({ user: "u1", dateKey: "2026-05-12", taskIds: ["t1"] });
    Task.find.mockResolvedValue([{ taskId: "t1", isActive: true }]);

    const req = { user: { id: "u1" }, query: { dateKey: "2026-05-12" } };
    const res = mockRes();

    await taskController.getDailyTasks(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ dateKey: "2026-05-12" }));
  });

  it("saveMyTaskProgress updates xp and task streak", async () => {
    const progressDoc = {
      taskIds: ["t1", "t2"],
      completedTaskIds: [],
      taskResults: {},
      xp: 0,
      save: jest.fn().mockResolvedValue({ xp: 10, completedTaskIds: ["t1"] }),
    };
    UserTaskProgress.findOne.mockResolvedValue(progressDoc);

    const userDoc = {
      lastTaskCompletedAt: null,
      taskStreakCount: 0,
      save: jest.fn().mockResolvedValue(undefined),
    };
    User.findById.mockResolvedValue(userDoc);

    const req = {
      user: { id: "u1" },
      body: {
        dateKey: "2026-05-12",
        completedTaskIds: ["t1", "invalid"],
        taskResults: { t1: { done: true }, invalid: { done: true } },
      },
    };
    const res = mockRes();

    await taskController.saveMyTaskProgress(req, res);

    expect(progressDoc.completedTaskIds).toEqual(["t1"]);
    expect(progressDoc.xp).toBe(10);
    expect(userDoc.taskStreakCount).toBe(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
