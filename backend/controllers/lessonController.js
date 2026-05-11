const Lesson = require("../models/lessonModel");
const Course = require("../models/courseModel");
const User = require("../models/userModel");

exports.createLesson = async (req, res) => {
	try {
		const courseId = req.params.courseId || req.body.courseId;
		const title = req.body.title;
		const description = req.body.description || "";
		const duration = req.body.duration || req.body.durationMinutes || 0;
		const order = req.body.order || req.body.orderIndex || 1;

		// Accept video via URL or uploaded file
		const videoUrl = req.body.videoUrl || "";
		const videoFile = req.files?.video ? "/uploads/" + req.files.video[0].filename : (req.body.videoFile || "");

		// Accept thumbnail via URL or uploaded file
		const thumbnail = req.files?.thumbnail ? "/uploads/" + req.files.thumbnail[0].filename : (req.body.thumbnail || req.body.thumbnailUrl || "");

		if (!courseId) {
			return res.status(400).json({ message: "courseId is required" });
		}

		// Lessons can only be created under an active (non-deleted) course.
		const course = await Course.findOne({ _id: courseId, isDeleted: false }).select("_id");
		if (!course) {
			return res.status(404).json({ message: "Course not found" });
		}

		if (!title || (!videoUrl && !videoFile)) {
			return res.status(400).json({ message: "Title and video (url or file) are required" });
		}

		const lesson = new Lesson({
			courseId,
			title,
			description,
			duration,
			order,
			videoUrl,
			videoFile,
			thumbnail,
			isPublished: true,
		});

		await lesson.save();

		res.status(201).json({ message: "Lesson created", lesson });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};



exports.getLessonsByCourse = async (req, res) => {

try {

// Hide soft-deleted lessons from users and admins by default.
const lessons = await Lesson.find({
courseId: req.params.courseId,
isDeleted: { $ne: true }
}).sort({ order: 1 });

res.json(lessons);

}

catch (error) {
res.status(500).json({ message: error.message });
}

};



exports.updateLesson = async (req, res) => {

try {

const lesson = await Lesson.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

if (!lesson) return res.status(404).json({ message: "Lesson not found" });

lesson.title = req.body.title || lesson.title;
lesson.description = req.body.description || lesson.description;
lesson.duration = req.body.duration || lesson.duration;

if (req.body.order !== undefined) {
const parsedOrder = Number(req.body.order);
if (Number.isFinite(parsedOrder) && parsedOrder > 0) {
lesson.order = parsedOrder;
}
}

if (req.body.videoUrl)
lesson.videoUrl = req.body.videoUrl;

if (req.files?.thumbnail)
lesson.thumbnail = "/uploads/" + req.files.thumbnail[0].filename;

if (req.files?.video)
lesson.videoFile = "/uploads/" + req.files.video[0].filename;

await lesson.save();

res.json({ message: "Lesson updated", lesson });

}

catch (error) {
res.status(500).json({ message: error.message });
}

};



exports.deleteLesson = async (req, res) => {

try {

const lesson = await Lesson.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

if (!lesson) {
return res.status(404).json({ message: "Lesson not found" });
}

// Soft delete preserves historical progress/notes references.
lesson.isDeleted = true;
await lesson.save();

res.json({ message: "Lesson deleted" });

}

catch (error) {
res.status(500).json({ message: error.message });
}

};

exports.getLessonPersonalNotes = async (req, res) => {

try {

const lesson = await Lesson.findById(req.params.lessonId).select("_id");

if (!lesson) {
return res.status(404).json({ message: "Lesson not found" });
}

const user = await User.findById(req.user._id).select("lessonProgress");

if (!user) {
return res.status(404).json({ message: "User not found" });
}

const lessonProgress = user.lessonProgress.find(
(entry) => entry.lessonId.toString() === req.params.lessonId
);

return res.json({
notes: lessonProgress?.notes || "",
journal: lessonProgress?.journal || "",
updatedAt: lessonProgress?.updatedAt || null,
});

}

catch (error) {
res.status(500).json({ message: error.message });
}

};

exports.saveLessonPersonalNotes = async (req, res) => {

try {

const lesson = await Lesson.findById(req.params.lessonId).select("_id");

if (!lesson) {
return res.status(404).json({ message: "Lesson not found" });
}

const user = await User.findById(req.user._id);

if (!user) {
return res.status(404).json({ message: "User not found" });
}

const notes = typeof req.body.notes === "string" ? req.body.notes : "";
const journal = typeof req.body.journal === "string" ? req.body.journal : "";

const existingEntry = user.lessonProgress.find(
(entry) => entry.lessonId.toString() === req.params.lessonId
);

if (existingEntry) {
existingEntry.notes = notes;
existingEntry.journal = journal;
existingEntry.updatedAt = new Date();
} else {
user.lessonProgress.push({
lessonId: req.params.lessonId,
notes,
journal,
updatedAt: new Date(),
});
}

await user.save();

return res.json({
message: "Lesson notes saved",
notes,
journal,
updatedAt: new Date(),
});

}

catch (error) {
res.status(500).json({ message: error.message });
}

};