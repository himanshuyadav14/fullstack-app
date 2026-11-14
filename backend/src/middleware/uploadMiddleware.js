const multer = require("multer");

// Store file in memory buffer so we can stream directly to Cloudinary
const storage = multer.memoryStorage();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Allowed avatar MIME types (Images only)
const avatarFileFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only image files (JPEG, PNG, WEBP, GIF) are allowed for avatars",
      ),
      false,
    );
  }
};

// Allowed task attachment MIME types (Images + Documents)
const attachmentFileFilter = (req, file, cb) => {
  const allowedMimes = [
    // Images
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "application/zip",
    "application/x-zip-compressed",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "File format not supported. Allowed formats: Images, PDF, Word, Excel, CSV, TXT, ZIP.",
      ),
      false,
    );
  }
};

const uploadAvatar = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: avatarFileFilter,
}).single("avatar");

const uploadAttachment = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: attachmentFileFilter,
}).single("file");

// Wrapper middleware for clean Express error handling
const handleUpload = (uploader) => {
  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "File size exceeds the 5MB limit",
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  };
};

module.exports = {
  uploadAvatarMiddleware: handleUpload(uploadAvatar),
  uploadAttachmentMiddleware: handleUpload(uploadAttachment),
};
