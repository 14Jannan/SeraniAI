const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(
{
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },

  title: {
    type: String,
    required: true
  },

  description: {
    type: String
  },

  videoUrl: {
    type: String
  },

  videoFile: {
    type: String
  },

  thumbnail: {
    type: String
  },

  order: {
    type: Number,
    required: true
  },

  duration: {
    type: Number
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Lesson", lessonSchema);