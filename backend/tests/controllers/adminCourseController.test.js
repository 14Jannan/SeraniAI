jest.mock("../../models/courseModel");
jest.mock("../../models/lessonModel");
jest.mock("../../models/enrollmentModel");
jest.mock("../../models/categoryModel");

const adminCourseController = require("../../controllers/adminCourseController");
const Course = require("../../models/courseModel");
const Lesson = require("../../models/lessonModel");
const Enrollment = require("../../models/enrollmentModel");
const Category = require("../../models/categoryModel");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("adminCourseController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BASE_URL = "http://localhost:5000";

    Course.distinct = jest.fn();
    Course.exists = jest.fn();
    Course.countDocuments = jest.fn();
    Course.aggregate = jest.fn();
    Course.findById = jest.fn();
    Course.findByIdAndUpdate = jest.fn();

    Lesson.countDocuments = jest.fn();
    Enrollment.countDocuments = jest.fn();

    Category.find = jest.fn();
    Category.findOne = jest.fn();
    Category.findById = jest.fn();
    Category.create = jest.fn();
  });

  it("getAdminCategories merges categories and course category strings", async () => {
    Category.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        { _id: "c1", name: "Focus" },
        { _id: "c2", name: "Mindfulness" },
      ]),
    });
    Course.distinct.mockResolvedValue(["focus", "Sleep"]);

    const res = mockRes();
    await adminCourseController.getAdminCategories({}, res);

    expect(res.json).toHaveBeenCalledWith([
      { _id: "c1", name: "Focus" },
      { _id: "c2", name: "Mindfulness" },
      { _id: null, name: "Sleep" },
    ]);
  });

  it("createAdminCategory returns 400 for duplicate", async () => {
    Category.findOne.mockResolvedValue({ _id: "existing" });
    const res = mockRes();

    await adminCourseController.createAdminCategory({ body: { name: "Focus" } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Category already exists" });
  });

  it("deleteAdminCategory returns 400 when category is used by courses", async () => {
    Category.findById.mockResolvedValue({ _id: "cat1", name: "Focus", isDeleted: false });
    Course.exists.mockResolvedValue(true);
    const res = mockRes();

    await adminCourseController.deleteAdminCategory({ params: { id: "cat1" } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Category is used by courses and cannot be deleted",
    });
  });

  it("getAdminCourseDashboard returns aggregated stats", async () => {
    Course.countDocuments.mockResolvedValue(3);
    Lesson.countDocuments.mockResolvedValue(15);
    Enrollment.countDocuments.mockResolvedValue(27);
    const res = mockRes();

    await adminCourseController.getAdminCourseDashboard({}, res);

    expect(res.json).toHaveBeenCalledWith({
      totalCourses: 3,
      totalLessons: 15,
      totalEnrolled: 27,
      avgRating: null,
    });
  });

  it("createCourse builds thumbnail from uploaded file", async () => {
    const savedCourse = {
      save: jest.fn().mockResolvedValue(undefined),
    };
    Course.mockImplementation(function MockCourse(payload) {
      Object.assign(this, payload);
      return { ...this, ...savedCourse };
    });

    const req = {
      body: {
        title: "Course A",
        instructorName: "Coach",
        description: "Desc",
        category: "Focus",
        level: "Beginner",
        isPublished: "false",
      },
      file: { filename: "thumb.png" },
    };
    const res = mockRes();

    await adminCourseController.createCourse(req, res);

    expect(Course).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Course A",
        isPublished: false,
        thumbnailUrl: "http://localhost:5000/uploads/thumb.png",
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
