const Course = require("../models/courseModel");
const Lesson = require("../models/lessonModel");
const Enrollment = require("../models/enrollmentModel");
const Category = require("../models/categoryModel");
const { getCache, setCache, deleteCache } = require("../utils/cache");

exports.getAdminCategories = async (req, res) => {
  try {
    const cached = await getCache("admin:categories");
    if (cached) return res.json(cached);

    const categories = await Category.find({ isDeleted: false }).sort({ name: 1 });

    const courseCategories = await Course.distinct("category", {
      isDeleted: false,
      category: { $nin: [null, ""] },
    });

    const merged = new Map();

    categories.forEach((category) => {
      merged.set(category.name.toLowerCase(), {
        _id: category._id,
        name: category.name,
      });
    });

    courseCategories.forEach((name) => {
      const key = String(name).toLowerCase();
      if (!merged.has(key)) {
        merged.set(key, { _id: null, name });
      }
    });

    const result = Array.from(merged.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    await setCache("admin:categories", result, 300); // 5 minutes
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.createAdminCategory = async (req, res) => {
  try {
    const rawName = (req.body.name || "").trim();
    if (!rawName) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const existing = await Category.findOne({
      name: { $regex: `^${rawName}$`, $options: "i" },
      isDeleted: false,
    });

    if (existing) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = await Category.create({ name: rawName });
    await deleteCache("admin:categories"); // bust cache
    return res.status(201).json(category);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.deleteAdminCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category || category.isDeleted) {
      return res.status(404).json({ message: "Category not found" });
    }

    const usedByCourses = await Course.exists({
      isDeleted: false,
      category: category.name,
    });

    if (usedByCourses) {
      return res
        .status(400)
        .json({ message: "Category is used by courses and cannot be deleted" });
    }

    category.isDeleted = true;
    await category.save();
    await deleteCache("admin:categories"); // bust cache

    return res.json({ message: "Category deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getAdminCourseDashboard = async (req, res) => {
  try {
    const cached = await getCache("admin:course:dashboard");
    if (cached) return res.json(cached);

    const totalCourses = await Course.countDocuments({ isDeleted: false });
    const totalLessons = await Lesson.countDocuments({ isDeleted: { $ne: true } });
    const totalEnrolled = await Enrollment.countDocuments({});
    const avgRating = null;

    const result = { totalCourses, totalLessons, totalEnrolled, avgRating };
    await setCache("admin:course:dashboard", result, 120); // 2 minutes
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getAdminCourses = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();

    // search queries are dynamic — only cache the no-search version
    const cacheKey = search ? null : "admin:courses:all";
    if (cacheKey) {
      const cached = await getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    const matchStage = {
      isDeleted: false,
      ...(search ? { title: { $regex: search, $options: "i" } } : {}),
    };

    const courses = await Course.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "lessons",
          localField: "_id",
          foreignField: "courseId",
          as: "lessons",
          pipeline: [{ $match: { isDeleted: { $ne: true } } }],
        },
      },
      {
        $lookup: {
          from: "enrollments",
          localField: "_id",
          foreignField: "courseId",
          as: "enrollments",
        },
      },
      {
        $addFields: {
          lessonsCount: { $size: "$lessons" },
          enrolledCount: { $size: "$enrollments" },
        },
      },
      { $project: { lessons: 0, enrollments: 0 } },
      { $sort: { createdAt: -1 } },
    ]);

    if (cacheKey) await setCache(cacheKey, courses, 300); // 5 minutes, only non-search
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const { title, instructorName, description, category, level, isPublished } =
      req.body;

    const normalizedPublished =
      isPublished === undefined ? true : String(isPublished) === "true";

    const newCourse = new Course({
      title,
      instructorName,
      description,
      category,
      level,
      isPublished: normalizedPublished,
      thumbnailUrl:
        req.body.thumbnailUrl ||
        (req.file ? `${process.env.BASE_URL}/uploads/${req.file.filename}` : ""),
    });

    await newCourse.save();

    // bust all course-related caches
    await deleteCache("admin:courses:all");
    await deleteCache("admin:course:dashboard");

    res.status(201).json(newCourse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);

    if (!course || course.isDeleted) {
      return res.status(404).json({ message: "Course not found" });
    }

    course.isDeleted = true;
    await course.save();

    // bust all course-related caches
    await deleteCache("admin:courses:all");
    await deleteCache("admin:course:dashboard");
    await deleteCache(`lessons:${id}`); // lessons for this course no longer needed

    res.json({ message: "Course deleted", courseId: id });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const normalizedPublished =
      req.body.isPublished === undefined
        ? undefined
        : String(req.body.isPublished) === "true";

    const updateData = {
      title: req.body.title,
      instructorName: req.body.instructorName,
      description: req.body.description,
      category: req.body.category,
      level: req.body.level,
      ...(normalizedPublished !== undefined
        ? { isPublished: normalizedPublished }
        : {}),
    };

    if (req.body.thumbnailUrl) {
      updateData.thumbnailUrl = req.body.thumbnailUrl;
    } else if (req.file) {
      updateData.thumbnailUrl = `${process.env.BASE_URL}/uploads/${req.file.filename}`;
    }

    const updated = await Course.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",
    });

    if (!updated) return res.status(404).json({ message: "Course not found" });

    // bust all course-related caches
    await deleteCache("admin:courses:all");
    await deleteCache("admin:course:dashboard");

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};