import multer from "multer";
import fs from "fs";
import path from "path";

// Define the upload directory
const uploadDir = path.join(process.cwd(), "public/temp");

// Ensure the directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Set the temporary directory for uploads
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  },
});

// Define allowed file MIME types (Images and Videos)
const allowedFileTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
];

// Configure Multer with file size limit and file type filtering
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
  fileFilter: function (req, file, cb) {
    if (allowedFileTypes.includes(file.mimetype)) {
      return cb(null, true); // Accept file
    } else {
      return cb(new Error("File type not allowed"), false); // Reject file
    }
  },
});
