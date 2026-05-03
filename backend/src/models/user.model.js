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
    profilePicture: {
      type:    String,
      default: null,
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
userSchema.methods.toSafeObject = function () {
  return {
    id:             this._id,
    name:           this.name,
    email:          this.email,
    profilePicture: this.profilePicture,
    createdAt:      this.createdAt,
    lastLogin:      this.lastLogin,
    loginCount:     (this.loginHistory || []).length,
  };
};

const User = mongoose.model("User", userSchema);

export default User;
