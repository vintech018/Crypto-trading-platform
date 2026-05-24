import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import logger from "./logger.js";

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});
logger.info("✅ Cloudinary SDK initialized successfully.");

/**
 * Uploads a buffer stream to Cloudinary securely.
 * Uses streamifier to stream the buffer directly from memory.
 *
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {String} folder - Target folder in Cloudinary (e.g. "solidus/avatars")
 * @returns {Promise<Object>} - Cloudinary upload result
 */
export const uploadStream = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: "auto",
      timeout: 60000, // 60s timeout
    };

    const cld_upload_stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          logger.error(`[Cloudinary] Upload failed for folder ${folder}`, { error: error.message });
          return reject(error);
        }
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(cld_upload_stream);
  });
};

/**
 * Safely deletes an asset from Cloudinary by its public_id.
 *
 * @param {String} publicId - The Cloudinary public_id of the asset
 */
export const deleteAsset = async (publicId) => {
  if (!publicId) return;

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === "ok") {
      logger.info(`[Cloudinary] Successfully deleted asset: ${publicId}`);
    } else {
      logger.warn(`[Cloudinary] Failed to delete asset: ${publicId}`, { result });
    }
  } catch (error) {
    logger.error(`[Cloudinary] Error deleting asset: ${publicId}`, { error: error.message });
  }
};


