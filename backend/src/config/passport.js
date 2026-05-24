/**
 * passport.js — Google OAuth 2.0 strategy configuration
 *
 * Uses passport-google-oauth20 (Authorization Code flow).
 * Session-less: passport is used only to handle the OAuth handshake.
 * After verification we issue a JWT ourselves — no passport sessions.
 *
 * passReqToCallback: true → gives the strategy verify fn access to `req`
 * so we can:
 *   1. Record the client IP and User-Agent in loginHistory.
 *   2. Read the OAuth `state` param to extract `mode` (login | signup)
 *      and enforce strict account separation:
 *        mode=login  → reject if user does NOT exist
 *        mode=signup → reject if user ALREADY exists
 */

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User   from "../models/User.model.js";
import Wallet from "../models/Wallet.model.js";
import Ledger from "../models/Ledger.model.js";
import logger from "../utils/logger.js";
import { env } from "./env.js";

const INITIAL_BALANCE = 50_000;

/** Decode the base64-JSON `state` param we set in auth.routes.js. */
function decodeState(stateParam) {
  try {
    if (!stateParam) return { mode: "login" };
    return JSON.parse(Buffer.from(stateParam, "base64").toString("utf8"));
  } catch {
    return { mode: "login" };
  }
}

/** Build a login event object from the current request. */
function makeLoginEvent(req, method) {
  return {
    timestamp: new Date(),
    ip:        req.ip || req.connection?.remoteAddress || "unknown",
    userAgent: req.headers?.["user-agent"] || "unknown",
    method,
  };
}

logger.info(`🔗 Initialising Google OAuth Strategy with callback: ${env.GOOGLE_CALLBACK_URL}`);

passport.use(
  new GoogleStrategy(
    {
      clientID:           env.GOOGLE_CLIENT_ID,
      clientSecret:       env.GOOGLE_CLIENT_SECRET,
      callbackURL:        env.GOOGLE_CALLBACK_URL,
      scope:              ["profile", "email"],
      passReqToCallback:  true,   // injects req as first arg to verify fn
    },
    async (req, _accessToken, _refreshToken, profile, done) => {
      console.log("\n[OAuth Debug] Passport verify callback triggered");
      console.log("Profile ID:", profile.id);
      console.log("Req Headers Origin:", req.headers.origin);
      console.log("Req Cookies:", req.cookies);

      try {
        const email          = profile.emails?.[0]?.value?.toLowerCase();
        const googleId       = profile.id;
        const name           = profile.displayName || email?.split("@")[0] || "Solidus User";
        const googlePhotoURL = profile.photos?.[0]?.value || null;
        const loginEvent     = makeLoginEvent(req, "google");

        if (!email) {
          return done(new Error("Google account has no email address."), null);
        }

        // ── Decode the mode from OAuth state ─────────────────────────────
        // state is set in auth.routes.js GET /api/auth/google and survives
        // Google's round-trip as req.query.state in the callback.
        const { mode } = decodeState(req.query.state);

        // ── Email-first lookup (email = primary identifier) ───────────────
        let user = await User.findOne({ email });

        // ────────────────────────────────────────────────────────────────
        // MODE: login — user MUST already exist
        // ────────────────────────────────────────────────────────────────
        if (mode === "login") {
          if (!user) {
            logger.warn("Google login rejected — user not registered", { email });
            return done(null, false, {
              message: "User not registered. Please sign up first.",
              code:    "NOT_REGISTERED",
            });
          }

          // Existing user — link googleId if not yet set, update login tracking
          if (!user.googleId) {
            user.googleId = googleId;
          }
          // Always refresh the Google avatar URL (it can change)
          // but NEVER touch profilePicture — that belongs to custom uploads.
          user.googlePhotoURL = googlePhotoURL ?? user.googlePhotoURL;
          user.lastLogin = loginEvent.timestamp;
          if (!Array.isArray(user.loginHistory)) user.loginHistory = [];
          user.loginHistory.push(loginEvent);
          if (user.loginHistory.length > 50) user.loginHistory = user.loginHistory.slice(-50);
          await user.save();
          logger.info("Google OAuth login", { userId: user._id, email, ip: loginEvent.ip });
          return done(null, user);
        }

        // ────────────────────────────────────────────────────────────────
        // MODE: signup — user must NOT already exist
        // ────────────────────────────────────────────────────────────────
        if (mode === "signup") {
          if (user) {
            logger.warn("Google signup rejected — user already exists", { email });
            return done(null, false, {
              message: "An account with this email already exists. Please log in instead.",
              code:    "ALREADY_EXISTS",
            });
          }

          // Brand-new user — create user + wallet
          user = await User.create({
            googleId,
            name,
            email,
            googlePhotoURL,
            lastLogin:    loginEvent.timestamp,
            loginHistory: [loginEvent],
          });

          try {
            await Wallet.create({ userId: user._id, balance: INITIAL_BALANCE });
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
          } catch (walletErr) {
            await User.findByIdAndDelete(user._id);
            return done(new Error("Failed to initialise wallet for new user."), null);
          }

          logger.info("New Google OAuth user registered", { userId: user._id, email, ip: loginEvent.ip });
          return done(null, user);
        }

        // Fallback — should never reach here
        return done(new Error(`Unknown OAuth mode: ${mode}`), null);

      } catch (err) {
        logger.error("Google OAuth strategy error", { message: err.message });
        return done(err, null);
      }
    }
  )
);

// No session serialization needed — we use JWTs, not passport sessions.
// These stubs satisfy passport's internal checks.
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
