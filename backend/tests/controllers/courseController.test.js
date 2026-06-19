jest.mock("../../models/enrollmentModel");
jest.mock("../../models/courseModel");

const courseController = require("../../controllers/courseController");
const Enrollment = require("../../models/enrollmentModel");
const Course = require("../../models/courseModel");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("courseController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Course.findOne = jest.fn();
    Enrollment.findOne = jest.fn();
    Enrollment.create = jest.fn();
  });

  it("returns 404 when course is not published or not found", async () => {
    Course.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const req = { params: { courseId: "c1" }, user: { _id: "u1" } };
    const res = mockRes();

    await courseController.enrollInCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Course not found or unavailable" });
  });

  it("returns 400 when already enrolled", async () => {
    Course.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: "c1" }),
    });
    Enrollment.findOne.mockResolvedValue({ _id: "e1" });

    const req = { params: { courseId: "c1" }, user: { _id: "u1" } };
    const res = mockRes();

    await courseController.enrollInCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Already enrolled" });
  });

  it("creates enrollment and returns 201", async () => {
    Course.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: "c1" }),
    });
    Enrollment.findOne.mockResolvedValue(null);
    Enrollment.create.mockResolvedValue({ _id: "e2", userId: "u1", courseId: "c1" });

    const req = { params: { courseId: "c1" }, user: { _id: "u1" } };
    const res = mockRes();

    await courseController.enrollInCourse(req, res);

    expect(Enrollment.create).toHaveBeenCalledWith({ userId: "u1", courseId: "c1" });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
