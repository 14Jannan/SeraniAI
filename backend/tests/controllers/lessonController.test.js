jest.mock("../../models/lessonModel");
jest.mock("../../models/courseModel");
jest.mock("../../models/userModel");

const lessonController = require("../../controllers/lessonController");
const Lesson = require("../../models/lessonModel");
const Course = require("../../models/courseModel");
const User = require("../../models/userModel");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("lessonController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Lesson.find = jest.fn();
    Lesson.findOne = jest.fn();
    Lesson.findById = jest.fn();
    Course.findOne = jest.fn();
    User.findById = jest.fn();
  });

  it("createLesson returns 400 when courseId is missing", async () => {
    const res = mockRes();

    await lessonController.createLesson({ params: {}, body: { title: "L1" } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "courseId is required" });
  });

  it("createLesson creates a lesson for active course", async () => {
    Course.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: "c1" }) });
    const savedLesson = { save: jest.fn().mockResolvedValue(undefined) };
    Lesson.mockImplementation(function MockLesson(payload) {
      Object.assign(this, payload);
      return { ...this, ...savedLesson };
    });

    const req = {
      params: { courseId: "c1" },
      body: { title: "Lesson A", videoUrl: "https://example.com/video" },
      files: {},
    };
    const res = mockRes();

    await lessonController.createLesson(req, res);

    expect(Lesson).toHaveBeenCalledWith(expect.objectContaining({
      courseId: "c1",
      title: "Lesson A",
      isPublished: true,
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("getLessonsByCourse returns sorted non-deleted lessons", async () => {
    const lessons = [{ _id: "l1" }];
    Lesson.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(lessons) });
    const res = mockRes();

    await lessonController.getLessonsByCourse({ params: { courseId: "c1" } }, res);

    expect(Lesson.find).toHaveBeenCalledWith({ courseId: "c1", isDeleted: { $ne: true } });
    expect(res.json).toHaveBeenCalledWith(lessons);
  });

  it("saveLessonPersonalNotes creates new lessonProgress entry", async () => {
    Lesson.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: "l1" }) });
    const user = {
      lessonProgress: [],
      save: jest.fn().mockResolvedValue(undefined),
    };
    User.findById.mockResolvedValue(user);

    const req = {
      params: { lessonId: "l1" },
      user: { _id: "u1" },
      body: { notes: "Note", journal: "Journal" },
    };
    const res = mockRes();

    await lessonController.saveLessonPersonalNotes(req, res);

    expect(user.lessonProgress).toHaveLength(1);
    expect(user.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Lesson notes saved" }));
  });
});
