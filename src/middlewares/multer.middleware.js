import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";

// Configure Multer disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use environment-specific path: OS temp directory for Vercel, public/temp for local
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    
    if (isProduction) {
      // For Vercel: use the OS temp directory
      const tempDir = path.join(os.tmpdir(), 'app-uploads');
      fs.mkdirSync(tempDir, { recursive: true });
      cb(null, tempDir);
    } else {
      // For local: use the public/temp directory as before
      const localDir = "./public/temp";
      fs.mkdirSync(localDir, { recursive: true });
      cb(null, localDir);
    }
  },
  filename: function (req, file, cb) {
    const ext = file.mimetype.split("/")[1]; // Get file extension
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + "." + ext;
    cb(null, uniqueName);
  },
});

// Define allowed file MIME types (Images and Videos)
const allowedFileTypes = [
  "image/jpeg",   // JPG and JPEG
  "image/jpg",    // JPG
  "image/png",    // PNG
  "image/gif",    // GIF
  "image/webp",   // WebP
  "video/mp4",    // MP4 video
  "video/mpeg",   // MPEG4 video
  "video/quicktime", // MOV video
];

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
  fileFilter: function (req, file, cb) {
    // Check if the file's MIME type is in the allowed list
    if (allowedFileTypes.includes(file.mimetype)) {
      return cb(null, true); // Accept file
    } else {
      return cb(new Error("File type not allowed"), false); // Reject file
    }
  },
});