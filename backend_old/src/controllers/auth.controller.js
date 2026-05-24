/**
 * auth.controller.js — Handles signup / login / logout / refresh / Google OAuth
 */

import jwt from "jsonwebtoken";
import * as authService       from "../services/auth.service.js";
import { sendSuccess }        from "../utils/helpers.js";
import { blacklist }          from "../utils/tokenBlacklist.js";
import { refreshTokenStore }  from "../utils/refreshTokenStore.js";
import { env }                from "../config/env.js";
import { emitAuditEvent }     from "../analytics/services/analyticsEmitter.js";

// ─── Internal helpers ──────────────────────────────────────────

function signAccessToken(user) {
  const userId = user._id ? user._id.toString() : user.id;
  const token  = jwt.sign(
    { id: userId, userId, email: user.email },   // userId alias for clarity
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  );

  // ── DEV debug — remove or guard with IS_PROD check before going live ──
  if (!env.IS_PROD) {
    console.log("\n[AUTH DEBUG] Access token issued");
    console.log("  userId :", userId);
    console.log("  email  :", user.email);
    console.log("  expires:", env.JWT_ACCESS_EXPIRES_IN);
    console.log("  JWT_TOKEN:", token, "\n");
  }

  return token;
}

function signRefreshToken(user) {
  const id = user._id ? user._id.toString() : user.id;
  return jwt.sign(
    { id, email: user.email },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );
}

function issueTokenPair(user) {
  const accessToken  = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  return { accessToken, refreshToken };
}

// ─── Cookie options ────────────────────────────────────────────

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: env.IS_PROD ? "none" : "lax",
  secure:   env.IS_PROD,
  path:     "/",
};

/**
 * Sets two httpOnly cookies on the response:
 *   solidus_access  (15 min)
 *   solidus_refresh (7 days)
 * And a non-httpOnly flag cookie for the Next.js middleware guard:
 *   solidus_authed  (7 days)
 */
function setCookies(res, accessToken, refreshToken) {
  res.cookie("solidus_access",  accessToken,  { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
  res.cookie("solidus_refresh", refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
  // Non-httpOnly — Next.js middleware reads this to guard routes
  res.cookie("solidus_authed", "true", {
    sameSite: env.IS_PROD ? "none" : "lax",
    secure:   env.IS_PROD,
    path:     "/",
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
}

function clearCookies(res) {
  const clear = { ...COOKIE_OPTS, maxAge: 0 };
  res.cookie("solidus_access",  "", clear);
  res.cookie("solidus_refresh", "", clear);
  res.cookie("solidus_authed",  "", { sameSite: env.IS_PROD ? "none" : "lax", secure: env.IS_PROD, path: "/", maxAge: 0 });
}

// ─── Email / Password routes ───────────────────────────────────

/** POST /api/auth/signup */
export async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const result = await authService.signup({ name, email, password });
    setCookies(res, result.accessToken, result.refreshToken);
    return sendSuccess(res, 201, "Account created successfully.", result);
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/login */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({
      email,
      password,
      ip:        req.ip || req.connection?.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
    });
    setCookies(res, result.accessToken, result.refreshToken);

    // Fire-and-forget audit log
    emitAuditEvent(result.user.id, "LOGIN", { 
      method: "email", 
      ip: req.ip || req.connection?.remoteAddress || "unknown" 
    });

    return sendSuccess(res, 200, "Login successful.", result);
  } catch (err) {
    next(err);
  }
}

// ─── Google OAuth ──────────────────────────────────────────────

/**
 * GET /api/auth/google/callback
 *
 * Called by passport after Google verifies the user.
 * req.user is the Mongoose user document attached by the GoogleStrategy.
 * We issue a JWT pair, set httpOnly cookies, and redirect to the dashboard.
 */
export async function googleCallback(req, res) {
  try {
    // req.user is set by passport on success.
    // On soft rejection (done(null, false, info)), passport.authenticate with
    // failureRedirect already handles the redirect — we only reach here on success.
    if (!req.user) {
      return res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
    }
    const { accessToken, refreshToken } = await issueTokenPair(req.user);
    const userId = req.user._id ? req.user._id.toString() : req.user.id;
    const { exp } = jwt.decode(refreshToken);
    await refreshTokenStore.save(userId, refreshToken, exp);
    setCookies(res, accessToken, refreshToken);
    
    // Fire-and-forget audit log
    emitAuditEvent(userId, "LOGIN", { method: "google" });

    // Redirect to frontend dashboard
    return res.redirect(`${env.FRONTEND_URL}/dashboard`);
  } catch (err) {
    return res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
  }
}


// ─── Shared protected routes ───────────────────────────────────

/**
 * GET /api/auth/me   (protected)
 */
export async function me(req, res, next) {
  try {
    const User = (await import("../models/User.model.js")).default;
    const user = await User.findById(req.user.id).lean();
    if (!user) {
      return sendSuccess(res, 200, "Authenticated user.", { user: req.user });
    }
    // Priority: custom Cloudinary upload > Google OAuth avatar > null
    const effectiveProfilePicture =
      (user.avatarPublicId && user.profilePicture)
        ? user.profilePicture
        : user.googlePhotoURL || null;

    return sendSuccess(res, 200, "Authenticated user.", {
      user: {
        id:             user._id,
        name:           user.name,
        email:          user.email,
        profilePicture: effectiveProfilePicture,
        createdAt:      user.createdAt,
        lastLogin:      user.lastLogin,
        loginCount:     (user.loginHistory || []).length,
        // Return only the last 10 login events to keep the payload small
        recentLogins:   (user.loginHistory || []).slice(-10).reverse(),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 * Accepts refreshToken from body OR solidus_refresh cookie.
 */
export async function refresh(req, res, next) {
  try {
    const token = req.body.refreshToken || req.cookies?.solidus_refresh;
    if (!token) {
      return next(Object.assign(new Error("Refresh token is required."), { status: 400 }));
    }
    const result = await authService.refreshAccessToken(token);
    // Rotate access cookie
    res.cookie("solidus_access", result.accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    return sendSuccess(res, 200, "Access token refreshed.", result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout   (protected)
 */
export async function logout(req, res, next) {
  try {
    // Blacklist access token + revoke refresh token
    if (req.token) await blacklist.add(req.token, req.user.exp);
    if (req.user?.id) {
      await refreshTokenStore.revoke(req.user.id);
      emitAuditEvent(req.user.id, "LOGOUT", { reason: "user_initiated" });
    }
    clearCookies(res);
    return sendSuccess(res, 200, "Logged out successfully.");
  } catch (err) {
    next(err);
  }
}
