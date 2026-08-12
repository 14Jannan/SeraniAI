import { beforeEach, describe, expect, it, vi } from "vitest";

const Lesson = require("../../models/lessonModel");
const Course = require("../../models/courseModel");
const User = require("../../models/userModel");
const lessonController = require("../../controllers/lessonController");

const USER_ID = "507f191e810c19729de860e1";
const COURSE_ID = "507f191e810c19729de860e2";
const LESSON_ID = "507f191e810c19729de860e3";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("lessonController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("createLesson returns 400 when courseId is missing", async () => {
    const res = mockRes();

    await lessonController.createLesson({ params: {}, body: { title: "L1" } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "courseId is required" });
  });

  it("getLessonsByCourse returns sorted non-deleted lessons", async () => {
    const lessons = [{ _id: LESSON_ID }];
    vi.spyOn(Lesson, "find").mockReturnValue({ sort: vi.fn().mockResolvedValue(lessons) });
    const res = mockRes();

    await lessonController.getLessonsByCourse({ params: { courseId: COURSE_ID } }, res);

    expect(Lesson.find).toHaveBeenCalledWith({ courseId: COURSE_ID, isDeleted: { $ne: true } });
    expect(res.json).toHaveBeenCalledWith(lessons);
  });

  it("saveLessonPersonalNotes creates new lessonProgress entry", async () => {
    vi.spyOn(Lesson, "findById").mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: LESSON_ID }) });
    const user = {
      lessonProgress: [],
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(User, "findById").mockResolvedValue(user);

    const req = {
      params: { lessonId: LESSON_ID },
      user: { _id: USER_ID },
      body: { notes: "Note", journal: "Journal" },
    };
    const res = mockRes();

    await lessonController.saveLessonPersonalNotes(req, res);

    expect(user.lessonProgress).toHaveLength(1);
    expect(user.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Lesson notes saved" }));
  });
});
