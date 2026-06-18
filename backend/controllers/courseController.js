const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");

exports.enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id; // comes from auth middleware

    // Enroll only into published, non-deleted courses.
    const course = await Course.findOne({
      _id: courseId,
      isDeleted: false,
      isPublished: true,
    }).select("_id");

    if (!course) {
      return res.status(404).json({ message: "Course not found or unavailable" });
    }

    // check if already enrolled
    const existing = await Enrollment.findOne({ userId, courseId });
    if (existing) {
      return res.status(400).json({ message: "Already enrolled" });
    }

    const enrollment = await Enrollment.create({
      userId,
      courseId,
    });

    res.status(201).json(enrollment);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
