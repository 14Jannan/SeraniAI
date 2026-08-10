/**
 * Admin Course Controller
 * Handles all admin-level course and category management operations
 * Includes: category CRUD, course CRUD, and admin dashboard statistics
 */

const Course = require("../models/courseModel");
const Lesson = require("../models/lessonModel");
const Enrollment = require("../models/enrollmentModel");
const Category = require("../models/categoryModel");
const { deleteCache } = require("../utils/cache");
const { notifyCourseUpdate, notifyNewCourse } = require("../services/notificationService");

/**
 * Get all categories (both from Category model and existing course categories)
 * Merges categories from the dedicated Category collection with any categories
 * used directly in courses (for backward compatibility)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {JSON} Array of unique categories sorted alphabetically
 */
exports.getAdminCategories = async (req, res) => {
  try {
    // Fetch all active categories from the Category model
    const categories = await Category.find({ isDeleted: false }).sort({ name: 1 });

    // Get all unique categories used directly in courses (backward compatibility)
    // This handles categories that were assigned before the dedicated Category model
    const courseCategories = await Course.distinct("category", {
      isDeleted: false,
      category: { $nin: [null, ""] },
    });

    // Use a Map to store unique categories (key = lowercase name for case-insensitive deduplication)
    const merged = new Map();

    // Add all categories from the Category model
    categories.forEach((category) => {
      // Store using lowercase key for case-insensitive lookup
      merged.set(category.name.toLowerCase(), {
        _id: category._id,
        name: category.name,
      });
    });

    // Add any course categories that aren't already in the merged map
    courseCategories.forEach((name) => {
      const key = String(name).toLowerCase();
      if (!merged.has(key)) {
        merged.set(key, { _id: null, name });
      }
    });

    // Convert Map to array and sort alphabetically by name
    return res.json(Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name)));
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Create a new category
 * Validates that the category name is unique (case-insensitive)
 * @param {Object} req - Express request object with {name: string} in body
 * @param {Object} res - Express response object
 * @returns {JSON} Created category object or error message
 */
exports.createAdminCategory = async (req, res) => {
  try {
    // Trim and validate the category name from request body
    const rawName = (req.body.name || "").trim();
    if (!rawName) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Check if category already exists (case-insensitive search)
    const existing = await Category.findOne({
      name: { $regex: `^${rawName}$`, $options: "i" },
      isDeleted: false,
    });

    // Return error if category already exists
    if (existing) {
      return res.status(400).json({ message: "Category already exists" });
    }

    // Create and save the new category
    const category = await Category.create({ name: rawName });
    return res.status(201).json(category);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Delete a category (soft delete)
 * Checks if category is in use by any courses before allowing deletion
 * @param {Object} req - Express request object with {id: string} in params
 * @param {Object} res - Express response object
 * @returns {JSON} Success message or error
 */
exports.deleteAdminCategory = async (req, res) => {
  try {
    // Get category ID from request parameters
    const { id } = req.params;
    const category = await Category.findById(id);

    // Check if category exists and is not already deleted
    if (!category || category.isDeleted) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check if any active courses are using this category
    const usedByCourses = await Course.exists({
      isDeleted: false,
      category: category.name,
    });

    // Prevent deletion if category is in use
    if (usedByCourses) {
      return res.status(400).json({ message: "Category is used by courses and cannot be deleted" });
    }

    // Perform soft delete by marking isDeleted as true
    category.isDeleted = true;
    await category.save();

    return res.json({ message: "Category deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
/**
 * Get admin dashboard statistics for courses
 * Returns counts of total courses, lessons, and enrollments
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {JSON} Dashboard statistics including totalCourses, totalLessons, totalEnrolled, avgRating
 */exports.getAdminCourseDashboard = async (req, res) => {
  try {
    // Count all active (non-deleted) courses
    const totalCourses = await Course.countDocuments({ isDeleted: false });
    
    // Count all active lessons (lessons may not have isDeleted field, so check if it's not true)
    const totalLessons = await Lesson.countDocuments({ isDeleted: { $ne: true } });
    
    // Count total course enrollments
    const totalEnrolled = await Enrollment.countDocuments({});

    // TODO: Implement rating system once available
    const avgRating = null;

    // Return dashboard statistics
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

/**
 * Get all courses with optional search filtering
 * Returns course list with lesson count and enrollment count for each course
 * @param {Object} req - Express request object with optional {search: string} in query
 * @param {Object} res - Express response object
 * @returns {JSON} Array of courses sorted by creation date (newest first)
 */
exports.getAdminCourses = async (req, res) => {
  try {
    // Get and trim the search term from query parameters
    const search = (req.query.search || "").trim();
    
    // Build MongoDB match stage: filter deleted courses and optionally search by title
    const matchStage = {
      isDeleted: false,
      // Add case-insensitive title search if search term is provided
      ...(search
        ? { title: { $regex: search, $options: "i" } }
        : {}),
    };

    // Use aggregation pipeline to get courses with related counts
    const courses = await Course.aggregate([
      // Stage 1: Filter courses based on match criteria
      { $match: matchStage },

      // Stage 2: Join with lessons collection to count lessons per course
      {
        $lookup: {
          from: "lessons",
          localField: "_id",
          foreignField: "courseId",
          as: "lessons",
          // Only include active lessons in the joined data
          pipeline: [{ $match: { isDeleted: { $ne: true } } }],
        },
      },

      // Stage 3: Join with enrollments collection to count enrollments per course
      {
        $lookup: {
          from: "enrollments",
          localField: "_id",
          foreignField: "courseId",
          as: "enrollments",
        },
      },

      // Stage 4: Add computed fields for lesson and enrollment counts
      {
        $addFields: {
          // Count the number of lessons in the joined array
          lessonsCount: { $size: "$lessons" },
          // Count the number of enrollments in the joined array
          enrolledCount: { $size: "$enrollments" },
        },
      },

      // Stage 5: Remove the lessons and enrollments arrays from output (we only need the counts)
      {
        $project: {
          lessons: 0,  // Exclude full lessons array from response
          enrollments: 0,  // Exclude full enrollments array from response
        },
      },

      // Stage 6: Sort courses by creation date (newest first)
      { $sort: { createdAt: -1 } },
    ]);

    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Create a new course
 * Handles both file upload (thumbnail) and provided URL
 * By default, courses are published unless specified otherwise
 * @param {Object} req - Express request object with course data in body and optional file upload
 * @param {Object} res - Express response object
 * @returns {JSON} Created course object or error
 */
exports.createCourse = async (req, res) => {
  try {
    // Extract course details from request body
    const { title, instructorName, description, category, level, isPublished } = req.body;

    // Normalize isPublished to boolean (default: true)
    const normalizedPublished =
      isPublished === undefined ? true : String(isPublished) === "true";

    // Create new course object with provided data
    const newCourse = new Course({
      title,
      instructorName,
      description,
      category,
      level,
      isPublished: normalizedPublished,
      // Handle thumbnail: use provided URL or uploaded file, default to empty string
      thumbnailUrl:
        req.body.thumbnailUrl ||
        (req.file ? `${process.env.BASE_URL}/uploads/${req.file.filename}` : ""),
    });

    // Save the new course to database
    await newCourse.save();

    // Invalidate course cache
    await deleteCache("courses:all");

    if (newCourse.isPublished) {
      await notifyNewCourse({
        courseId: newCourse._id,
        courseTitle: newCourse.title,
      });
    }

    res.status(201).json(newCourse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Note: admin-level lesson creation moved to lessonController.js

/**
 * Delete a course (soft delete)
 * Marks course as deleted without removing it from database
 * @param {Object} req - Express request object with {id: string} in params
 * @param {Object} res - Express response object
 * @returns {JSON} Success message with courseId or error
 */
exports.deleteCourse = async (req, res) => {
  try {
    // Get course ID from route parameters
    const { id } = req.params;
    const course = await Course.findById(id);

    // Check if course exists and is not already deleted
    if (!course || course.isDeleted) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Perform soft delete by marking as deleted
    course.isDeleted = true;
    await course.save();

    // Invalidate course cache
    await deleteCache("courses:all");

    res.json({ message: "Course deleted", courseId: id });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Update an existing course
 * Allows updating all course fields including thumbnail
 * @param {Object} req - Express request object with {id: string} in params and updated data in body
 * @param {Object} res - Express response object
 * @returns {JSON} Updated course object or error
 */
exports.updateCourse = async (req, res) => {
  try {
    // Get course ID from route parameters
    const { id } = req.params;

    // Normalize isPublished boolean only if it was explicitly provided
    const normalizedPublished =
      req.body.isPublished === undefined
        ? undefined
        : String(req.body.isPublished) === "true";

    // Prepare update data with all fields
    const updateData = {
      title: req.body.title,
      instructorName: req.body.instructorName,
      description: req.body.description,
      category: req.body.category,
      level: req.body.level,
      // Only include isPublished if it was explicitly provided
      ...(normalizedPublished !== undefined ? { isPublished: normalizedPublished } : {}),
    };

    // Handle thumbnail update: prefer provided URL, then uploaded file
    if (req.body.thumbnailUrl) {
      updateData.thumbnailUrl = req.body.thumbnailUrl;
    } else if (req.file) {
      // Use uploaded file if no URL provided
      updateData.thumbnailUrl = `${process.env.BASE_URL}/uploads/${req.file.filename}`;
    }

    // Update course and return the modified document
    const updated = await Course.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",  // Return the updated document
    });

    // Return 404 if course doesn't exist
    if (!updated) return res.status(404).json({ message: "Course not found" });

    // Invalidate course cache
    await deleteCache("courses:all");

    await notifyCourseUpdate({
      courseId: updated._id,
      courseTitle: updated.title,
      message: `${updated.title} has new course updates.`,
    });

    // Return the updated course
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};




