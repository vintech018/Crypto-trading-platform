/**
 * User.model.js — Mongoose schema for the users collection
 *
 * Supports two login strategies:
 *   1. Google OAuth  → populated via googleId, profilePicture
 *   2. Email/Password → populated via passwordHash (optional for OAuth users)
 *
 * Instance helper:
 *   user.toSafeObject() — strips sensitive fields for API responses
 */

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────
    name: {
      type:      String,
      required:  [true, "Name is required"],
      trim:      true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    email: {
      type:      String,
      required:  [true, "Email is required"],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },

    // ── Google OAuth ──────────────────────────────────────────────
    googleId: {
      type:   String,
      unique: true,
      sparse: true, // allows null for email/password users without violating unique
    },
    // Custom profile picture uploaded via Cloudinary (/api/uploads/avatar)
    // This field is ONLY set by the upload controller — never by OAuth.
    profilePicture: {
      type:    String,
      default: null,
    },
    // Cloudinary public_id — presence signals "user has a custom upload"
    avatarPublicId: {
      type: String,
      default: null,
    },
    // Google OAuth avatar URL — stored separately so custom uploads
    // always take priority and are never overwritten by re-login.
    googlePhotoURL: {
      type:    String,
      default: null,
    },

    // ── KYC & Identity ──────────────────────────────────────────
    kycDocuments: {
      type: [{
        documentType: { type: String, enum: ["PAN", "AADHAAR", "PASSPORT", "ID_CARD", "OTHER"], required: true },
        url:          { type: String, required: true },
        publicId:     { type: String, required: true },
        uploadedAt:   { type: Date, default: Date.now },
        status:       { type: String, enum: ["PENDING", "VERIFIED", "REJECTED"], default: "PENDING" },
      }],
      default: [],
    },

    // ── Email / Password ──────────────────────────────────────────
    passwordHash: {
      type:   String,
      select: false, // never returned in queries by default
      // NOT required — Google OAuth users have no password
    },

    // ── Activity tracking ─────────────────────────────────────
    lastLogin: {
      type:    Date,
      default: null,
    },

    // Each login event: when, from what IP, with what browser, via which method.
    // Default [] ensures existing documents without this field don't break.
    loginHistory: {
      type: [{
        timestamp: { type: Date,   required: true },
        ip:        { type: String, default: "unknown" },
        userAgent: { type: String, default: "unknown" },
        method:    { type: String, enum: ["google", "email"], required: true },
      }],
      default: [],
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
  }
);

// ── Instance helper ───────────────────────────────────────────────

/**
 * Returns the effective profile picture URL with priority:
 *   1. Custom Cloudinary upload (profilePicture + avatarPublicId)
 *   2. Google OAuth avatar (googlePhotoURL)
 *   3. null (frontend renders fallback initial)
 */
userSchema.methods.getEffectiveProfilePicture = function () {
  if (this.avatarPublicId && this.profilePicture) return this.profilePicture;
  return this.googlePhotoURL || null;
};

userSchema.methods.toSafeObject = function () {
  return {
    id:             this._id,
    name:           this.name,
    email:          this.email,
    profilePicture: this.getEffectiveProfilePicture(),
    createdAt:      this.createdAt,
    lastLogin:      this.lastLogin,
    loginCount:     (this.loginHistory || []).length,
  };
};

const User = mongoose.model("User", userSchema);

export default User;
