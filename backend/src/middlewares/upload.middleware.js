import multer from "multer";
import path from "path";
import logger from "../utils/logger.js";
import { AppError } from "../utils/helpers.js";

// Ensure memory storage ONLY (no local disk writes)
const storage = multer.memoryStorage();

// Allowed configurations
const ALLOWED_MIME_TYPES = {
  avatar: ["image/jpeg", "image/png", "image/webp"],
  kyc: ["image/jpeg", "image/png", "application/pdf"],
};

const MAX_SIZES = {
  avatar: 5 * 1024 * 1024, // 5MB
  kyc: 10 * 1024 * 1024,   // 10MB
};

const DANGEROUS_EXTENSIONS = [".exe", ".sh", ".bat", ".cmd", ".msi", ".vbs", ".js", ".php", ".py"];

/**
 * Validates the file buffer before it's passed to Cloudinary.
 */
const fileFilter = (uploadType) => {
  return (req, file, cb) => {
    // 1. Extension validation (reject dangerous)
    const ext = path.extname(file.originalname).toLowerCase();
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      logger.warn(`[Upload] Rejected dangerous extension: ${ext}`);
      return cb(new AppError("Invalid file extension. Executable files are strictly prohibited.", 400));
    }

    // 2. MIME type validation
    const allowedMimes = ALLOWED_MIME_TYPES[uploadType] || [];
    if (!allowedMimes.includes(file.mimetype)) {
      logger.warn(`[Upload] Rejected invalid MIME type: ${file.mimetype} for ${uploadType}`);
      return cb(new AppError(`Invalid file type. Allowed: ${allowedMimes.join(", ")}`, 400));
    }

    // 3. Filename sanitization (basic security)
    file.originalname = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");

    cb(null, true);
  };
};

/**
 * Configures the multer instance dynamically based on upload type.
 */
const createUploader = (uploadType) => {
  const maxSize = MAX_SIZES[uploadType] || 2 * 1024 * 1024; // Default 2MB fallback

  return multer({
    storage,
    limits: {
      fileSize: maxSize,
      files: 1, // Prevent flooding by strictly limiting to 1 file per field
    },
    fileFilter: fileFilter(uploadType),
  });
};

// Export pre-configured middlewares
export const uploadAvatar = createUploader("avatar").single("avatar");
export const uploadKyc = createUploader("kyc").single("document");

/**
 * Helper to handle multer errors gracefully and consistently
 */
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    logger.warn(`[Upload] Multer Error: ${err.message}`);
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "File is too large." });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  } else if (err) {
    logger.error(`[Upload] System Error: ${err.message}`);
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
  next();
};
