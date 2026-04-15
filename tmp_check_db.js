const mongoose = require("mongoose");
const path = require("path");
// Manually setting env to find dbConnect
process.env.MONGO_URI = "mongodb://localhost:27017/seraniai"; // Fallback guess or check .env

const courseSchema = new mongoose.Schema({
    thumbnailUrl: { type: String, default: "" },
});
const Course = mongoose.model("Course", courseSchema);

async function checkCourses() {
  try {
      await mongoose.connect("mongodb://localhost:27017/seraniai");
      const course = await Course.findOne({ thumbnailUrl: { $ne: "" } });
      console.log("Sample Course Thumbnail:", course ? course.thumbnailUrl : "No thumbnail found");
  } catch (err) {
      console.error(err);
  } finally {
      process.exit();
  }
}

checkCourses();
