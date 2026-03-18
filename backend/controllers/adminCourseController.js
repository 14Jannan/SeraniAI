const Course = require("../models/courseModel");
const Lesson = require("../models/lessonModel");
const Enrollment = require("../models/enrollmentModel");
const Category = require("../models/categoryModel");

exports.getAdminCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: false }).sort({ name: 1 });

    // Keep backward compatibility with existing course categories.
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

    return res.json(Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name)));
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
      return res.status(400).json({ message: "Category is used by courses and cannot be deleted" });
    }

    category.isDeleted = true;
    await category.save();

    return res.json({ message: "Category deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getAdminCourseDashboard = async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments({ isDeleted: false });
    const totalLessons = await Lesson.countDocuments({ isDeleted: { $ne: true } });
    const totalEnrolled = await Enrollment.countDocuments({}); // real enrollments

    // rating system not implemented yet
    const avgRating = null;

    res.json({
      totalCourses,
      totalLessons,
      totalEnrolled,
      avgRating,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
exports.getAdminCourses = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const matchStage = {
      isDeleted: false,
      ...(search
        ? { title: { $regex: search, $options: "i" } }
        : {}),
    };

    const courses = await Course.aggregate([
      { $match: matchStage },

      // count lessons per course
      {
        $lookup: {
          from: "lessons",
          localField: "_id",
          foreignField: "courseId",
          as: "lessons",
          pipeline: [{ $match: { isDeleted: { $ne: true } } }],
        },
      },

      // count enrollments per course
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

      {
        $project: {
          lessons: 0,
          enrollments: 0,
        },
      },

      { $sort: { createdAt: -1 } },
    ]);

    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const { title, instructorName, description, category, level, isPublished } = req.body;

    const normalizedPublished =
      isPublished === undefined ? true : String(isPublished) === "true";

    const newCourse = new Course({
      title,
      instructorName,
      description,
      category,
      level,
      isPublished: normalizedPublished,
      thumbnailUrl: req.file
        ? `http://localhost:7001/uploads/${req.file.filename}`
        : "",
    });

    await newCourse.save();

    res.status(201).json(newCourse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.createLesson = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, videoUrl, durationMinutes, thumbnailUrl, orderIndex } = req.body;

    if (!title || !videoUrl) {
      return res.status(400).json({ message: "Title and videoUrl are required" });
    }

    const lesson = await Lesson.create({
      courseId,
      title,
      videoUrl,
      durationMinutes: durationMinutes || 0,
      thumbnailUrl: thumbnailUrl || "",
      orderIndex: orderIndex || 1,
      isPublished: true,
    });

    res.status(201).json(lesson);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

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
      ...(normalizedPublished !== undefined ? { isPublished: normalizedPublished } : {}),
    };

    if (req.file) {
      updateData.thumbnailUrl = `http://localhost:7001/uploads/${req.file.filename}`;
    }

    const updated = await Course.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};




