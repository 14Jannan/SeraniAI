const multer = require("multer");
const path = require("path");

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

// Used for course/lesson thumbnail + video uploads (admin-only routes).
// Restrict by field name so a "thumbnail" field can't be used to smuggle a
// video/executable and vice versa, and cap size so a single upload can't
// exhaust disk space.
const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "video") {
    return cb(
      VIDEO_MIME_TYPES.has(file.mimetype)
        ? null
        : new Error("Only mp4, webm, or mov video files are allowed"),
      VIDEO_MIME_TYPES.has(file.mimetype),
    );
  }

  // Default (covers "thumbnail" and any other image field).
  return cb(
    IMAGE_MIME_TYPES.has(file.mimetype)
      ? null
      : new Error("Only jpeg, png, webp, or gif image files are allowed"),
    IMAGE_MIME_TYPES.has(file.mimetype),
  );
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB ceiling (covers lesson videos)
});

module.exports = upload;
