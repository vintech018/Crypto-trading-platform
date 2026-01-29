import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { prisma } from "../config/prisma.js";
import { isDev } from "../config/env.js";
import { decryptString, encryptString, randomNumericOtp } from "../utils/crypto.js";
import { signAccessToken, signTwoFaToken } from "../utils/jwt.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function normalizePhone(phone) {
  // Keep it simple for now: digits + optional leading +
  return phone.trim();
}

export async function signupWithEmail({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      twoFactorEnabled: false,
      twoFactorSecretEnc: null,
    },
  });

  // Force 2FA setup for Gmail flow (no access JWT yet)
  return {
    userId: user.id,
    requires2faSetup: true,
    twoFaToken: signTwoFaToken(user.id, "2fa-setup"),
  };
}

export async function loginWithEmailPassword({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !user.passwordHash) {
    return { ok: false, message: "Invalid email or password" };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { ok: false, message: "Invalid email or password" };

  // Conditional: Gmail login requires authenticator
  if (!user.twoFactorSecretEnc) {
    return {
      ok: true,
      requires2faSetup: true,
      twoFaToken: signTwoFaToken(user.id, "2fa-setup"),
    };
  }

  return {
    ok: true,
    requires2fa: true,
    twoFaToken: signTwoFaToken(user.id, "2fa-login"),
  };
}

export async function setupTwoFactor({ userId }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const secret = speakeasy.generateSecret({
    name: `Crypto Platform (${user.email ?? user.phone ?? user.id})`,
    length: 20,
  });

  const secretEnc = encryptString(secret.base32);

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecretEnc: secretEnc,
      twoFactorEnabled: false,
    },
  });

  const otpauthUrl = secret.otpauth_url;
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  return {
    otpauthUrl,
    qrDataUrl,
    // base32 is sensitive; return only for immediate setup UX if needed.
    // Keeping it out of the API response is safer for production.
  };
}

export async function verifyTwoFactor({ userId, code, purpose }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorSecretEnc) return { ok: false, message: "2FA not set up" };

  const base32 = decryptString(user.twoFactorSecretEnc);
  const ok = speakeasy.totp.verify({
    secret: base32,
    encoding: "base32",
    token: code,
    window: 1,
  });
  if (!ok) return { ok: false, message: "Invalid authenticator code" };

  // Mark enabled after successful setup verification
  if (purpose === "2fa-setup" && !user.twoFactorEnabled) {
    await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
  }

  // Only after full verification: issue access JWT
  return { ok: true, accessToken: signAccessToken(userId) };
}

export async function sendPhoneOtp({ phone }) {
  const normalizedPhone = normalizePhone(phone);
  const otp = randomNumericOtp(6);
  const otpHash = await bcrypt.hash(otp, 10);

  // Best-effort cleanup: delete old challenges for this phone
  await prisma.otpChallenge.deleteMany({ where: { phone: normalizedPhone } });

  await prisma.otpChallenge.create({
    data: {
      phone: normalizedPhone,
      otpHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0,
    },
  });

  if (isDev) {
    // FREE mode: no SMS provider. This is intentionally dev-only.
    // In production, integrate SMS and do NOT log OTPs.
    // eslint-disable-next-line no-console
    console.log(`[DEV OTP] phone=${normalizedPhone} otp=${otp}`);
  }

  return { ok: true };
}

export async function verifyPhoneOtp({ phone, otp }) {
  const normalizedPhone = normalizePhone(phone);
  const challenge = await prisma.otpChallenge.findFirst({
    where: { phone: normalizedPhone },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return { ok: false, message: "OTP not found. Please request a new OTP." };

  if (challenge.expiresAt.getTime() < Date.now()) {
    await prisma.otpChallenge.delete({ where: { id: challenge.id } });
    return { ok: false, message: "OTP expired. Please request a new OTP." };
  }

  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.otpChallenge.delete({ where: { id: challenge.id } });
    return { ok: false, message: "Too many attempts. Please request a new OTP." };
  }

  const valid = await bcrypt.compare(otp, challenge.otpHash);
  if (!valid) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, message: "Invalid OTP." };
  }

  // Success: consume challenge
  await prisma.otpChallenge.delete({ where: { id: challenge.id } });

  // Create/find user by phone
  const user =
    (await prisma.user.findUnique({ where: { phone: normalizedPhone } })) ??
    (await prisma.user.create({ data: { phone: normalizedPhone } }));

  return { ok: true, accessToken: signAccessToken(user.id) };
}


