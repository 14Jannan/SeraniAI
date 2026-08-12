import { beforeEach, describe, expect, it, vi } from "vitest";

const { Task } = require("../../models/taskModel");
const UserTaskProgress = require("../../models/userTaskProgressModel");
const User = require("../../models/userModel");
const taskController = require("../../controllers/taskController");

const USER_ID = "507f191e810c19729de860e1";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("taskController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("getTasks returns tasks list", async () => {
    vi.spyOn(Task, "countDocuments").mockResolvedValue(1);
    vi.spyOn(Task, "find").mockReturnValue({ sort: vi.fn().mockResolvedValue([{ taskId: "t1", title: "Task 1" }]) });

    const req = { query: { activeOnly: "true", category: "Focus" } };
    const res = mockRes();

    await taskController.getTasks(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ taskId: "t1", title: "Task 1" }]);
  });

  it("createTask returns 400 when required fields are missing", async () => {
    const req = { body: { title: "Incomplete Task" } };
    const res = mockRes();

    await taskController.createTask(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "taskId, title, category, duration and type are required" });
  });

  it("deleteTask returns 404 when task is not found", async () => {
    vi.spyOn(Task, "findOneAndDelete").mockResolvedValue(null);

    const req = { params: { id: "nonexistent" } };
    const res = mockRes();

    await taskController.deleteTask(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Task not found" });
  });
});
