import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAccessToken(userId) {
    return jwt.sign({ sub: userId, typ: "access" }, env.JWT_SECRET, {
        expiresIn: env.JWT_ACCESS_TTL_SECONDS,
    });
}

export function signTwoFaToken(userId, purpose) {
    // purpose: "2fa-login" | "2fa-setup"
    return jwt.sign({ sub: userId, typ: purpose }, env.JWT_SECRET, {
        expiresIn: env.JWT_2FA_TTL_SECONDS,
    });
}

export function verifyToken(token) {
    return jwt.verify(token, env.JWT_SECRET);
}


