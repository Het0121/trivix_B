import multer from "multer";


// Configure Multer disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp"); // Set the temporary directory for uploads
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
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


// Add file size limit (10MB) and file type restriction
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
