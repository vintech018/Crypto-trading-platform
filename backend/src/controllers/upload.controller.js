import User from "../models/User.model.js";
import { uploadStream, deleteAsset } from "../utils/cloudinary.js";
import { sendSuccess, AppError } from "../utils/helpers.js";
import logger from "../utils/logger.js";

/**
 * Handle avatar upload securely.
 * Replaces the old avatar in Cloudinary and falls back safely on error.
 */
export async function uploadAvatar(req, res, next) {
  let uploadedPublicId = null;
  try {
    if (!req.file) {
      throw new AppError("No image file provided.", 400);
    }

    const user = await User.findById(req.user.id);
    if (!user) throw new AppError("User not found.", 404);

    const oldPublicId = user.avatarPublicId;

    // Stream directly to Cloudinary without local disk usage
    const result = await uploadStream(req.file.buffer, "solidus/avatars");
    uploadedPublicId = result.public_id;

    user.profilePicture = result.secure_url;
    user.avatarPublicId = result.public_id;
    await user.save();

    // Safely delete old asset after successful DB commit
    if (oldPublicId) {
      deleteAsset(oldPublicId).catch(err => {
        logger.error(`Failed to delete old avatar ${oldPublicId}`, { error: err.message });
      });
    }

    logger.info(`[Upload] Avatar updated for user ${user.id}`);
    
    return sendSuccess(res, 200, "Avatar updated successfully.", {
      profilePicture: user.profilePicture,
    });
  } catch (err) {
    // DB Update failed -> Rollback Cloudinary upload
    if (uploadedPublicId) {
      deleteAsset(uploadedPublicId).catch(rollbackErr => {
        logger.error(`[Upload Rollback] Failed to delete orphaned avatar ${uploadedPublicId}`, { error: rollbackErr.message });
      });
    }
    next(err);
  }
}

/**
 * Handle KYC Document upload securely.
 * Saves metadata in the user document array.
 */
export async function uploadKyc(req, res, next) {
  let uploadedPublicId = null;
  try {
    if (!req.file) {
      throw new AppError("No document file provided.", 400);
    }

    const { documentType } = req.body;
    const allowedTypes = ["PAN", "AADHAAR", "PASSPORT", "ID_CARD", "OTHER"];
    
    if (!documentType || !allowedTypes.includes(documentType)) {
      throw new AppError(`Invalid documentType. Must be one of: ${allowedTypes.join(", ")}`, 400);
    }

    const user = await User.findById(req.user.id);
    if (!user) throw new AppError("User not found.", 404);

    // Upload to Cloudinary
    const result = await uploadStream(req.file.buffer, "solidus/kyc");
    uploadedPublicId = result.public_id;

    // Append KYC metadata
    user.kycDocuments.push({
      documentType,
      url: result.secure_url,
      publicId: result.public_id,
      status: "PENDING",
      uploadedAt: new Date()
    });

    await user.save();

    logger.info(`[Upload] KYC document ${documentType} uploaded for user ${user.id}`);

    return sendSuccess(res, 200, "KYC document uploaded successfully.", {
      kycDocuments: user.kycDocuments
    });
  } catch (err) {
    // Rollback orphaned asset
    if (uploadedPublicId) {
      deleteAsset(uploadedPublicId).catch(rollbackErr => {
        logger.error(`[Upload Rollback] Failed to delete orphaned KYC doc ${uploadedPublicId}`, { error: rollbackErr.message });
      });
    }
    next(err);
  }
}

/**
 * Return health and configuration limits of the upload service.
 */
export async function uploadHealth(req, res, next) {
  try {
    return sendSuccess(res, 200, "Upload infrastructure health.", {
      cloudinaryConfigured: true,
      limits: {
        avatarMaxSizeBytes: 5 * 1024 * 1024,
        kycMaxSizeBytes: 10 * 1024 * 1024,
        allowedAvatarMimes: ["image/jpeg", "image/png", "image/webp"],
        allowedKycMimes: ["image/jpeg", "image/png", "application/pdf"],
      }
    });
  } catch (err) {
    next(err);
  }
}
