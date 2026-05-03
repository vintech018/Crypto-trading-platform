/**
 * validate.middleware.js — request body / query validator
 *
 * Uses native logic (no external validator dep) to keep
 * the bundle lean. Swap with zod/joi if the schema grows.
 */

import { AppError } from "../utils/helpers.js";
import { SUPPORTED_COINS } from "../utils/constants.js";

// ─── Auth Validators ──────────────────────────────────────────

export function validateSignup(req, _res, next) {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2)
    errors.push("Name must be at least 2 characters.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push("A valid email is required.");

  // ─── Password rules ────────────────────────────────────────
  if (!password || password.length < 8)
    errors.push("Password must be at least 8 characters.");
  if (password && !/[A-Z]/.test(password))
    errors.push("Password must contain at least one uppercase letter.");
  if (password && !/[0-9]/.test(password))
    errors.push("Password must contain at least one number.");
  if (password && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    errors.push("Password must contain at least one special character.");

  if (errors.length) return next(new AppError(errors.join(" "), 400));
  next();
}

export function validateLogin(req, _res, next) {
  const { email, password } = req.body;
  if (!email || !password)
    return next(new AppError("Email and password are required.", 400));
  next();
}

// ─── Trade Validators ─────────────────────────────────────────

export function validateTrade(req, _res, next) {
  const { coin, quantity, price } = req.body;
  const errors = [];

  if (!coin || !SUPPORTED_COINS.includes(coin.toUpperCase()))
    errors.push(`Coin must be one of: ${SUPPORTED_COINS.join(", ")}.`);

  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty <= 0)
    errors.push("Quantity must be a positive number.");

  const prc = parseFloat(price);
  if (isNaN(prc) || prc <= 0)
    errors.push("Price must be a positive number.");

  if (errors.length) return next(new AppError(errors.join(" "), 400));

  // Normalise
  req.body.coin     = coin.toUpperCase();
  req.body.quantity = qty;
  req.body.price    = prc;
  next();
}

// ─── Wallet Validators ───────────────────────────────────────

export function validateDeposit(req, _res, next) {
  const { amount } = req.body;
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0)
    return next(new AppError("Deposit amount must be a positive number.", 400));
  req.body.amount = amt;
  next();
}

// ─── Report Validators ───────────────────────────────────────

export function validateReportQuery(req, _res, next) {
  const { startDate, endDate, asset } = req.query;

  if (startDate && isNaN(Date.parse(startDate)))
    return next(new AppError("startDate is not a valid date.", 400));
  if (endDate && isNaN(Date.parse(endDate)))
    return next(new AppError("endDate is not a valid date.", 400));
  if (startDate && endDate && new Date(startDate) > new Date(endDate))
    return next(new AppError("startDate must be before endDate.", 400));
  if (asset && !SUPPORTED_COINS.includes(asset.toUpperCase()))
    return next(new AppError(`asset must be one of: ${SUPPORTED_COINS.join(", ")}.`, 400));

  // Normalise
  if (asset) req.query.asset = asset.toUpperCase();
  next();
}
