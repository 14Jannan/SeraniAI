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

// This middleware handles course/lesson uploads: a "thumbnail" image field
// and, separately, a "video" field. Restricting to an explicit allow-list
// (instead of accepting any file) is what actually prevents someone from
// uploading an .html/.svg file that later gets served back out of
// /uploads and executed as stored XSS in a browser - not just a size cap.
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "video") {
    if (ALLOWED_VIDEO_MIME_TYPES.has(file.mimetype)) return cb(null, true);
    return cb(new Error("Only MP4, WEBM, or MOV video files are allowed"));
  }

  // "thumbnail" (and any other field on this shared middleware) is treated
  // as an image upload.
  if (ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) return cb(null, true);
  return cb(new Error("Only JPG, PNG, WEBP, or GIF image files are allowed"));
};

const upload = multer({
  storage,
  // Generous enough for a course video while still ruling out unbounded
  // disk-filling uploads.
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter,
});

// Exposed for unit testing the allow-list logic directly, without needing a
// real multipart HTTP request.
upload.fileFilter = fileFilter;

module.exports = upload;
