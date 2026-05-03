/**
 * auth.routes.js
 *
 * Email / Password:
 *   POST /api/auth/signup   (rate limited)
 *   POST /api/auth/login    (rate limited)
 *   POST /api/auth/refresh  (rate limited)
 *   GET  /api/auth/me       (protected — access token required)
 *   POST /api/auth/logout   (protected — access token required)
 *
 * Google OAuth:
 *   GET  /api/auth/google?mode=login   → redirect to Google (login-only, rejects new users)
 *   GET  /api/auth/google?mode=signup  → redirect to Google (signup-only, rejects existing users)
 *   GET  /api/auth/google/callback     → Google redirects here with code + state (mode)
 *
 * The `mode` param is encoded into OAuth `state` so it survives the round-trip
 * through Google's servers back to our callback URL.
 */

import { Router }   from "express";
import passport     from "../config/passport.js";
import * as ctrl    from "../controllers/auth.controller.js";
import { authenticate }   from "../middlewares/auth.middleware.js";
import { authLimiter }    from "../middlewares/rateLimit.middleware.js";
import {
  validateSignup,
  validateLogin,
} from "../middlewares/validate.middleware.js";

const router = Router();

const FRONTEND = process.env.FRONTEND_URL || "http://localhost:3000";

// ── Email / Password ───────────────────────────────────────────
router.post("/signup",  authLimiter, validateSignup, ctrl.signup);
router.post("/login",   authLimiter, validateLogin,  ctrl.login);
router.post("/refresh", authLimiter, ctrl.refresh);
router.get( "/me",      authenticate, ctrl.me);
router.post("/logout",  authenticate, ctrl.logout);

// ── Google OAuth ───────────────────────────────────────────────

/**
 * Step 1 — Initiate OAuth.
 *
 * Reads ?mode=login|signup from the query string.
 * Encodes it into OAuth `state` so it comes back in the callback.
 * Defaults to "login" if omitted.
 *
 * Examples:
 *   GET /api/auth/google?mode=login   ← from Login page "Continue with Google"
 *   GET /api/auth/google?mode=signup  ← from Sign Up page "Continue with Google"
 */
router.get("/google", (req, res, next) => {
  const mode  = req.query.mode === "signup" ? "signup" : "login";
  const state = Buffer.from(JSON.stringify({ mode })).toString("base64");

  passport.authenticate("google", {
    scope:   ["profile", "email"],
    session: false,
    state,                 // survives Google's round-trip
  })(req, res, next);
});

/**
 * Step 2 — Google redirects back here with `code` and `state`.
 *
 * We use a manual passport.authenticate call (no failureRedirect) so we can
 * read the rejection info.code from done(null, false, info) and forward the
 * exact error message to the frontend.
 *
 *   NOT_REGISTERED  → login attempted but user not in DB
 *   ALREADY_EXISTS  → signup attempted but email already registered
 *   oauth_failed    → any other passport error
 */
router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user, info) => {
    if (err) {
      return res.redirect(`${FRONTEND}/login?error=oauth_failed`);
    }
    if (!user) {
      const code = info?.code || "oauth_failed";
      return res.redirect(`${FRONTEND}/login?error=${encodeURIComponent(code)}`);
    }
    // Attach user so googleCallback can read it
    req.user = user;
    next();
  })(req, res, next);
}, ctrl.googleCallback);


export default router;
