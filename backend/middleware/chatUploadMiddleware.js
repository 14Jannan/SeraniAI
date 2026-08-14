const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// The chat attachment picker in the web/mobile UI only ever offers .pdf and
// .txt (see MessageInput.jsx's `accept=".pdf,.txt"`), and chatControllers'
// extractTextFromFile() only knows how to read those two types anyway - so
// this allow-list matches what the feature actually supports, while also
// closing off uploading e.g. an .html file that would later be served back
// out of /uploads as stored XSS.
const ALLOWED_CHAT_FILE_TYPES = new Set(["application/pdf", "text/plain"]);

const fileFilter = (req, file, cb) => {
  if (ALLOWED_CHAT_FILE_TYPES.has(file.mimetype)) return cb(null, true);
  return cb(new Error("Only PDF or TXT files are allowed"));
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter,
});

// Exposed for unit testing the allow-list logic directly.
upload.fileFilter = fileFilter;

module.exports = upload;
