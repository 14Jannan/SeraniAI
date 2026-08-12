import { beforeEach, describe, expect, it, vi } from "vitest";

const Course = require("../../models/courseModel");
const Lesson = require("../../models/lessonModel");
const Enrollment = require("../../models/enrollmentModel");
const Category = require("../../models/categoryModel");
const adminCourseController = require("../../controllers/adminCourseController");

const CAT_ID = "507f191e810c19729de860e1";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("adminCourseController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    process.env.BASE_URL = "http://localhost:5000";
  });

  it("getAdminCategories merges categories and course category strings", async () => {
    vi.spyOn(Category, "find").mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        { _id: "c1", name: "Focus" },
        { _id: "c2", name: "Mindfulness" },
      ]),
    });
    vi.spyOn(Course, "distinct").mockResolvedValue(["focus", "Sleep"]);

    const res = mockRes();
    await adminCourseController.getAdminCategories({}, res);

    expect(res.json).toHaveBeenCalledWith([
      { _id: "c1", name: "Focus" },
      { _id: "c2", name: "Mindfulness" },
      { _id: null, name: "Sleep" },
    ]);
  });

  it("createAdminCategory returns 400 for duplicate", async () => {
    vi.spyOn(Category, "findOne").mockResolvedValue({ _id: "existing" });
    const res = mockRes();

    await adminCourseController.createAdminCategory({ body: { name: "Focus" } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Category already exists" });
  });

  it("deleteAdminCategory returns 400 when category is used by courses", async () => {
    vi.spyOn(Category, "findById").mockResolvedValue({ _id: CAT_ID, name: "Focus", isDeleted: false });
    vi.spyOn(Course, "exists").mockResolvedValue(true);
    const res = mockRes();

    await adminCourseController.deleteAdminCategory({ params: { id: CAT_ID } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Category is used by courses and cannot be deleted",
    });
  });

  it("getAdminCourseDashboard returns aggregated stats", async () => {
    vi.spyOn(Course, "countDocuments").mockResolvedValue(3);
    vi.spyOn(Lesson, "countDocuments").mockResolvedValue(15);
    vi.spyOn(Enrollment, "countDocuments").mockResolvedValue(27);
    const res = mockRes();

    await adminCourseController.getAdminCourseDashboard({}, res);

    expect(res.json).toHaveBeenCalledWith({
      totalCourses: 3,
      totalLessons: 15,
      totalEnrolled: 27,
      avgRating: null,
    });
  });
});
