import { beforeEach, describe, expect, it, vi } from "vitest";

const Enrollment = require("../../models/enrollmentModel");
const Course = require("../../models/courseModel");
const courseController = require("../../controllers/courseController");

const USER_ID = "507f191e810c19729de860e1";
const COURSE_ID = "507f191e810c19729de860e2";
const ENROLL_ID = "507f191e810c19729de860e3";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("courseController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("returns 404 when course is not published or not found", async () => {
    vi.spyOn(Course, "findOne").mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    const req = { params: { courseId: COURSE_ID }, user: { _id: USER_ID } };
    const res = mockRes();

    await courseController.enrollInCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Course not found or unavailable" });
  });

  it("returns 400 when already enrolled", async () => {
    vi.spyOn(Course, "findOne").mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: COURSE_ID }),
    });
    vi.spyOn(Enrollment, "findOne").mockResolvedValue({ _id: ENROLL_ID });

    const req = { params: { courseId: COURSE_ID }, user: { _id: USER_ID } };
    const res = mockRes();

    await courseController.enrollInCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Already enrolled" });
  });

  it("creates enrollment and returns 201", async () => {
    vi.spyOn(Course, "findOne").mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: COURSE_ID }),
    });
    vi.spyOn(Enrollment, "findOne").mockResolvedValue(null);
    vi.spyOn(Enrollment, "create").mockResolvedValue({ _id: ENROLL_ID, userId: USER_ID, courseId: COURSE_ID });

    const req = { params: { courseId: COURSE_ID }, user: { _id: USER_ID } };
    const res = mockRes();

    await courseController.enrollInCourse(req, res);

    expect(Enrollment.create).toHaveBeenCalledWith({ userId: USER_ID, courseId: COURSE_ID });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
