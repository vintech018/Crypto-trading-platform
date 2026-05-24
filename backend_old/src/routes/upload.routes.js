import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { uploadAvatar, uploadKyc, handleUploadError } from "../middlewares/upload.middleware.js";
import { uploadAvatar as uploadAvatarCtrl, uploadKyc as uploadKycCtrl, uploadHealth } from "../controllers/upload.controller.js";
import { uploadLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();

// ─── Health check (Unprotected) ─────────────────────────────────────────────
router.get("/health", uploadHealth);

// ─── Protected Routes ───────────────────────────────────────────────────────
router.use(authenticate);

// Avatar upload route
router.post(
  "/avatar",
  uploadLimiter,
  uploadAvatar,
  handleUploadError,
  uploadAvatarCtrl
);

// KYC Document upload route
router.post(
  "/kyc",
  uploadLimiter,
  uploadKyc,
  handleUploadError,
  uploadKycCtrl
);

export default router;
