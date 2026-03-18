const Lesson = require("../models/lessonModel");
const User = require("../models/userModel");

exports.createLesson = async (req, res) => {

try {

const { courseId, title, description, duration, order } = req.body;

const lesson = new Lesson({

courseId,
title,
description,
duration,
order,

videoUrl: req.body.videoUrl || "",

videoFile: req.files?.video
? "/uploads/" + req.files.video[0].filename
: "",

thumbnail: req.files?.thumbnail
? "/uploads/" + req.files.thumbnail[0].filename
: ""

});

await lesson.save();

res.status(201).json({
message: "Lesson created",
lesson
});

}

catch (error) {
res.status(500).json({ message: error.message });
}

};



exports.getLessonsByCourse = async (req, res) => {

try {

const lessons = await Lesson.find({
courseId: req.params.courseId
}).sort({ order: 1 });

res.json(lessons);

}

catch (error) {
res.status(500).json({ message: error.message });
}

};



exports.updateLesson = async (req, res) => {

try {

const lesson = await Lesson.findById(req.params.id);

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

await Lesson.findByIdAndDelete(req.params.id);

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