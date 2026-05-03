/**
 * auth.service.js — Authentication business logic
 *
 * Responsibilities:
 *  - Create a new user (signup)
 *  - Verify credentials (login)
 *  - Sign access + refresh tokens
 *  - Refresh an expired access token using a valid refresh token
 *
 * DB layer: Mongoose (MongoDB Atlas)
 */

import bcrypt from "bcrypt";
import jwt    from "jsonwebtoken";

import User   from "../models/User.model.js";
import Wallet from "../models/Wallet.model.js";
import Ledger from "../models/Ledger.model.js";
import logger from "../utils/logger.js";
import { env }    from "../config/env.js";
import { AppError } from "../utils/helpers.js";
import { refreshTokenStore } from "../utils/refreshTokenStore.js";

const SALT_ROUNDS = env.BCRYPT_SALT_ROUNDS;

// ─── Signup ───────────────────────────────────────────────────

/**
 * Create a user + wallet atomically.
 * Returns both an accessToken and a refreshToken.
 *
 * MongoDB does not have built-in multi-document ACID transactions on
 * free clusters; we use a sequential create with rollback on failure.
 */
export async function signup({ name, email, password }) {
  // Check for duplicate email before hashing (fast path)
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new AppError("Email is already registered.", 409);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  let user;
  try {
    user = await User.create({ name, email, passwordHash });
  } catch (err) {
    // Handle race condition on unique email index
    if (err.code === 11000) throw new AppError("Email is already registered.", 409);
    throw err;
  }

  // Create wallet (separate document) — if this fails, clean up user
  const INITIAL_BALANCE = 50000;
  try {
    const wallet = await Wallet.create({ userId: user._id, balance: INITIAL_BALANCE });
    // Write the initial deposit to the ledger so balance is always derivable
    await Ledger.create({
      userId:        user._id,
      type:          "DEPOSIT",
      amount:        INITIAL_BALANCE,
      asset:         "USD",
      balanceBefore: 0,
      balanceAfter:  INITIAL_BALANCE,
      referenceId:   null,
      note:          "Initial virtual portfolio funding",
    });
  } catch (err) {
    await User.findByIdAndDelete(user._id);
    throw new AppError("Failed to initialise wallet. Please try again.", 500);
  }

  logger.info("New user registered", { userId: user._id, email });

  // Record the signup itself as the first login event
  const signupEvent = { timestamp: new Date(), ip: "unknown", userAgent: "unknown", method: "email" };
  user.lastLogin = signupEvent.timestamp;
  user.loginHistory = [signupEvent];
  await user.save();

  const { accessToken, refreshToken } = issueTokenPair(user);
  return { accessToken, refreshToken, user: sanitiseUser(user) };
}

// ─── Login ────────────────────────────────────────────────────

/**
 * Verify credentials and return both an accessToken and a refreshToken.
 */
export async function login({ email, password, ip, userAgent }) {
  // +passwordHash re-includes the field that schema hides by default
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");

  // User must already be registered — no silent account creation on login
  if (!user) throw new AppError("User not registered. Please sign up first.", 404);

  // Only after confirming user exists — generic message prevents enumeration of password
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new AppError("Invalid email or password.", 401);

  // Record login event with method:'email'
  const loginEvent = {
    timestamp: new Date(),
    ip:        ip || "unknown",
    userAgent: userAgent || "unknown",
    method:    "email",
  };
  user.lastLogin = loginEvent.timestamp;
  if (!Array.isArray(user.loginHistory)) user.loginHistory = [];
  user.loginHistory.push(loginEvent);
  await user.save();

  logger.info("User logged in", { userId: user._id, ip });

  const { accessToken, refreshToken } = issueTokenPair(user);
  return { accessToken, refreshToken, user: sanitiseUser(user) };
}

// ─── Refresh ──────────────────────────────────────────────────

/**
 * Validate a refresh token and issue a new access token.
 *
 * @param {string} token — raw refresh JWT passed by the client
 * @returns {{ accessToken: string }}
 */
export function refreshAccessToken(token) {
  // 1. Verify the JWT signature + expiry
  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new AppError("Refresh token has expired. Please log in again.", 401);
    }
    throw new AppError("Invalid refresh token.", 401);
  }

  const { id, email } = decoded;

  // 2. Make sure the token is still in our store
  //    (revoked on logout, so even a valid-looking JWT is rejected)
  if (!refreshTokenStore.isValid(id, token)) {
    throw new AppError("Refresh token has been revoked. Please log in again.", 401);
  }

  // 3. Issue a fresh access token
  const accessToken = signAccessToken({ id, email });
  logger.info("Access token refreshed", { userId: id });

  return { accessToken };
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Sign a short-lived access token.
 * Used by protected routes via the Authorization: Bearer header.
 */
function signAccessToken(user) {
  // Support both ObjectId (_id) and plain id (from JWT payload)
  const userId = user._id ? user._id.toString() : user.id;
  const token  = jwt.sign(
    { id: userId, userId, email: user.email },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  );

  // DEV-only debug log — auto-suppressed in production
  if (process.env.NODE_ENV !== "production") {
    console.log("\n[AUTH DEBUG] Access token issued");
    console.log("  userId :", userId);
    console.log("  email  :", user.email);
    console.log("  expires:", env.JWT_ACCESS_EXPIRES_IN);
    console.log("  JWT_TOKEN:", token, "\n");
  }

  return token;
}

/**
 * Sign a long-lived refresh token.
 * Used ONLY at /api/auth/refresh — never on protected routes.
 */
function signRefreshToken(user) {
  const id = user._id ? user._id.toString() : user.id;
  return jwt.sign(
    { id, email: user.email },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );
}

/**
 * Issue an access + refresh token pair and persist the refresh token.
 * Both tokens are returned so the caller can send them to the client.
 */
function issueTokenPair(user) {
  const accessToken  = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // Decode (without verifying) to read the exp claim for storage
  const { exp } = jwt.decode(refreshToken);
  const userId  = user._id ? user._id.toString() : user.id;
  refreshTokenStore.save(userId, refreshToken, exp);

  return { accessToken, refreshToken };
}

/** Strip sensitive fields before returning to client. */
function sanitiseUser(user) {
  return {
    id:             user._id,
    name:           user.name,
    email:          user.email,
    profilePicture: user.profilePicture || null,
    lastLogin:      user.lastLogin || null,
    createdAt:      user.createdAt,
  };
}
