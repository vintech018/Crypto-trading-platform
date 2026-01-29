import { Router } from "express";
import { authLimiter, otpSendLimiter, otpVerifyLimiter } from "../middlewares/rateLimit.middleware.js";
import { login, me, sendOtp, setup2fa, signup, verify2fa, verifyOtp } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

export const authRouter = Router();

// Gmail (email/password) flow
authRouter.post("/signup", authLimiter, signup);
authRouter.post("/login", authLimiter, login);
authRouter.post("/setup-2fa", authLimiter, setup2fa);
authRouter.post("/verify-2fa", authLimiter, verify2fa);

// Phone OTP (FREE) flow
authRouter.post("/send-otp", otpSendLimiter, sendOtp);
authRouter.post("/verify-otp", otpVerifyLimiter, verifyOtp);

// Session/user
authRouter.get("/me", authLimiter, requireAuth, me);


