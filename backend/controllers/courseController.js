const Enrollment = require("../models/enrollmentModel");

exports.enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id; // comes from auth middleware

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
