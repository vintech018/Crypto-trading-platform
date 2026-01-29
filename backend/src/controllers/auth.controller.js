import { z } from "zod";
import {
  loginWithEmailPassword,
  sendPhoneOtp,
  setupTwoFactor,
  signupWithEmail,
  verifyPhoneOtp,
  verifyTwoFactor,
} from "../services/auth.service.js";
import { verifyToken } from "../utils/jwt.js";
import { prisma } from "../config/prisma.js";

const EmailSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const EmailLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const SendOtpSchema = z.object({
  phone: z.string().min(6),
});

const VerifyOtpSchema = z.object({
  phone: z.string().min(6),
  otp: z.string().regex(/^\d{6}$/),
});

const VerifyTwoFaSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  twoFaToken: z.string().min(1),
});

function requireTwoFaToken(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  return token;
}

export async function signup(req, res) {
  const parsed = EmailSignupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });

  try {
    const result = await signupWithEmail(parsed.data);
    return res.status(201).json(result);
  } catch (e) {
    // Unique constraint violation handling (Prisma)
    if (String(e?.code) === "P2002") return res.status(409).json({ message: "Email already in use" });
    return res.status(500).json({ message: "Signup failed" });
  }
}

export async function login(req, res) {
  const parsed = EmailLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });

  const result = await loginWithEmailPassword(parsed.data);
  if (!result.ok) return res.status(401).json({ message: result.message });
  return res.json(result);
}

export async function sendOtp(req, res) {
  const parsed = SendOtpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });

  await sendPhoneOtp(parsed.data);
  return res.json({ ok: true });
}

export async function verifyOtp(req, res) {
  const parsed = VerifyOtpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });

  const result = await verifyPhoneOtp(parsed.data);
  if (!result.ok) return res.status(401).json({ message: result.message });
  return res.json(result);
}

export async function setup2fa(req, res) {
  const twoFaToken = requireTwoFaToken(req);
  if (!twoFaToken) return res.status(401).json({ message: "Missing 2FA token" });

  try {
    const payload = verifyToken(twoFaToken);
    if (payload.typ !== "2fa-setup") return res.status(401).json({ message: "Invalid token type" });

    const result = await setupTwoFactor({ userId: payload.sub });
    return res.json(result);
  } catch {
    return res.status(401).json({ message: "Invalid or expired 2FA token" });
  }
}

export async function verify2fa(req, res) {
  const parsed = VerifyTwoFaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });

  try {
    const payload = verifyToken(parsed.data.twoFaToken);
    const purpose = payload.typ;
    if (purpose !== "2fa-login" && purpose !== "2fa-setup") {
      return res.status(401).json({ message: "Invalid token type" });
    }
    const result = await verifyTwoFactor({ userId: payload.sub, code: parsed.data.code, purpose });
    if (!result.ok) return res.status(401).json({ message: result.message });
    return res.json(result);
  } catch {
    return res.status(401).json({ message: "Invalid or expired 2FA token" });
  }
}

export async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId },
    select: {
      id: true,
      email: true,
      phone: true,
      twoFactorEnabled: true,
      createdAt: true,
    },
  });
  return res.json({ user });
}


