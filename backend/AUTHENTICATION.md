## Authentication system (Backend) — Detailed design + implementation notes

This backend implements **two separate authentication methods** with a **conditional security flow**:

- **Phone login (OTP, free)**: phone → OTP → **login success** (no authenticator).
- **Gmail login (email + password)**: email/password verified → **Authenticator (TOTP) required** → login success only if TOTP is valid.

The backend issues **JWT access tokens only after full verification**:

- Phone flow: JWT issued only by `POST /auth/verify-otp`
- Gmail flow: JWT issued only by `POST /auth/verify-2fa`

---

## Tech stack & libraries

- **Express**: routing + middleware
- **Prisma**: persistence (SQLite in dev)
- **bcryptjs**: password hashing + OTP hashing
- **jsonwebtoken**: access tokens + short-lived “2FA tokens”
- **speakeasy**: RFC 6238 TOTP (Microsoft Authenticator / Google Authenticator / Authy compatible)
- **qrcode**: generate QR `data:` URL for the `otpauth://` URI
- **express-rate-limit**: rate limiting on auth endpoints
- **zod**: input validation + environment validation
- **Node `crypto`**: AES-256-GCM encryption for storing TOTP secret

---

## Environment variables (required)

Environment validation happens in `src/config/env.js` using `zod`. Missing/invalid env vars will fail fast at startup.

Required keys (see `backend/README.md` for a template):

- **`DATABASE_URL`**: Prisma datasource (dev uses SQLite file DB)
- **`JWT_SECRET`**: secret used to sign JWTs (**must be long**)
- **`JWT_ACCESS_TTL_SECONDS`**: access token TTL (default 3600)
- **`JWT_2FA_TTL_SECONDS`**: 2FA token TTL (default 300)
- **`ENCRYPTION_KEY_BASE64`**: 32-byte base64 key for AES-256-GCM
- **`FRONTEND_ORIGIN`**: allowed CORS origin (dev: `http://localhost:5173`)

Files:
- `src/config/env.js`
- `src/server.js` (loads dotenv before env parsing)
- `src/app.js` (CORS configured from env)

---

## Database design (Prisma schema)

File: `prisma/schema.prisma`

### `User`

Stores user identity and 2FA configuration.

- **`email`**: optional, unique (used for Gmail flow)
- **`phone`**: optional, unique (used for OTP flow)
- **`passwordHash`**: bcrypt hash for email/password users
- **`twoFactorSecretEnc`**: **encrypted base32 TOTP secret** (AES-256-GCM)
- **`twoFactorEnabled`**: boolean toggled true after successful TOTP verification during setup

Important behavior:
- OTP login may create a user with only `phone` set.
- Gmail signup creates a user with `email` + `passwordHash`.

### `OtpChallenge`

Stores temporary OTP challenges for phone login.

- **`phone`**: phone number string the OTP was requested for
- **`otpHash`**: bcrypt hash of the 6-digit OTP
- **`expiresAt`**: server-side expiry timestamp (**5 minutes**)
- **`attempts`**: number of failed verification attempts (max attempts enforced)

Important behavior:
- OTPs are **never stored in plaintext**.
- Challenges are deleted when:
  - verified successfully
  - expired
  - too many attempts

---

## File layout & separation of concerns

### Routing

File: `src/routes/auth.routes.js`

Defines all auth endpoints and attaches rate limiters. Keeps Express routing concerns separate from business logic.

### Controllers

File: `src/controllers/auth.controller.js`

Responsibilities:
- Validate request payloads (`zod`)
- Translate request → service calls
- Translate service results → HTTP responses
- Handle token parsing for 2FA setup (Bearer token)

Controllers should *not* implement cryptography or DB logic directly (that belongs in services/utils).

### Services

File: `src/services/auth.service.js`

Responsibilities:
- Core authentication and security logic
- DB reads/writes through Prisma
- OTP generation and verification rules
- TOTP setup and verification rules
- Conditional “Gmail requires authenticator” flow control
- Token issuance (delegated to `src/utils/jwt.js`)

### Utilities

Files:
- `src/utils/crypto.js`: AES-256-GCM encrypt/decrypt + crypto-safe numeric OTP generator
- `src/utils/jwt.js`: access token + 2FA token creation/verification

### Middlewares

Files:
- `src/middlewares/rateLimit.middleware.js`: rate limits for auth endpoints
- `src/middlewares/auth.middleware.js`: verifies access JWT for protected endpoints (used by `/auth/me`)

---

## Token model (critical)

This system uses **two JWT “types”**:

### 1) Access token (`typ: "access"`)

Issued **only** after the user is fully authenticated:
- Phone flow: `POST /auth/verify-otp` → `{ accessToken }`
- Gmail flow: `POST /auth/verify-2fa` → `{ accessToken }`

Payload shape:
- `sub`: user id
- `typ`: `"access"`

Verification:
- `src/middlewares/auth.middleware.js` checks token signature, expiry, and `typ === "access"`.

### 2) 2FA token (short-lived, not an access token)

Used to complete Gmail flow steps **before** a session is fully authenticated:

- `typ: "2fa-setup"`:
  - returned by `POST /auth/signup` or by `POST /auth/login` when user has no secret yet
  - used as Bearer token for `POST /auth/setup-2fa`
  - also accepted by `POST /auth/verify-2fa` to complete setup + issue access token

- `typ: "2fa-login"`:
  - returned by `POST /auth/login` when user already has a secret
  - used in `POST /auth/verify-2fa` to complete login + issue access token

Why this matters:
- We never give an access token until:
  - phone OTP is correct, or
  - email/password is correct AND TOTP is correct

Implementation:
- `src/utils/jwt.js` (`signAccessToken`, `signTwoFaToken`, `verifyToken`)

---

## Endpoint reference (request/response behavior)

Base path: `/auth`

### `POST /auth/send-otp` (Phone → request OTP)

Purpose:
- Generate a 6-digit OTP
- Hash and store it in `OtpChallenge`
- Expire after 5 minutes
- In dev mode, log OTP to console (no SMS provider)

Body:
```json
{ "phone": "+15555550123" }
```

Success:
```json
{ "ok": true }
```

Security:
- Rate limited (`otpSendLimiter`)
- Any previous OTP challenges for the phone are deleted before creating a new one

Where:
- Controller: `sendOtp` in `src/controllers/auth.controller.js`
- Service: `sendPhoneOtp` in `src/services/auth.service.js`

---

### `POST /auth/verify-otp` (Phone → verify OTP)

Purpose:
- Validate OTP:
  - must exist
  - must not be expired
  - must not exceed attempt limit
- If valid:
  - consume/delete the `OtpChallenge`
  - find or create the `User` by phone
  - **issue access JWT**

Body:
```json
{ "phone": "+15555550123", "otp": "123456" }
```

Success:
```json
{ "ok": true, "accessToken": "..." }
```

Failure examples:
- expired / missing / too many attempts / invalid OTP
```json
{ "message": "OTP expired. Please request a new OTP." }
```

Security:
- Rate limited (`otpVerifyLimiter`)
- Attempts incremented on failures; challenge is deleted after max attempts

Where:
- Controller: `verifyOtp`
- Service: `verifyPhoneOtp`

---

### `POST /auth/signup` (Gmail → create account)

Purpose:
- Create a user with:
  - normalized email
  - bcrypt password hash
- Do **not** issue access token.
- Return a **2FA setup token** (short-lived) to proceed with authenticator setup.

Body:
```json
{ "email": "user@gmail.com", "password": "Passw0rd!" }
```

Success:
```json
{
  "userId": "cuid...",
  "requires2faSetup": true,
  "twoFaToken": "..."
}
```

Where:
- Controller: `signup`
- Service: `signupWithEmail`

---

### `POST /auth/login` (Gmail → verify email/password)

Purpose:
- Verify email/password using bcrypt
- Then apply the conditional rule:
  - If user has **no TOTP secret**:
    - return `requires2faSetup: true` and a `twoFaToken` (`typ: "2fa-setup"`)
  - If user has a TOTP secret:
    - return `requires2fa: true` and a `twoFaToken` (`typ: "2fa-login"`)

Body:
```json
{ "email": "user@gmail.com", "password": "Passw0rd!" }
```

Success (needs setup):
```json
{ "ok": true, "requires2faSetup": true, "twoFaToken": "..." }
```

Success (already set up):
```json
{ "ok": true, "requires2fa": true, "twoFaToken": "..." }
```

Failure:
```json
{ "message": "Invalid email or password" }
```

Where:
- Controller: `login`
- Service: `loginWithEmailPassword`

---

### `POST /auth/setup-2fa` (Generate QR for Microsoft Authenticator)

Purpose:
- Generate a TOTP secret using `speakeasy.generateSecret()`
- Store it **encrypted** in `User.twoFactorSecretEnc`
- Return:
  - `otpauthUrl` (for debugging/integration)
  - `qrDataUrl` (image `data:` URL to show in frontend)

Auth:
- Requires **Bearer token** which must be a 2FA token of type `2fa-setup`

Headers:
```
Authorization: Bearer <twoFaToken>
```

Success:
```json
{ "otpauthUrl": "otpauth://...", "qrDataUrl": "data:image/png;base64,..." }
```

Where:
- Controller: `setup2fa`
- Service: `setupTwoFactor`

Notes:
- This QR works with:
  - Microsoft Authenticator
  - Google Authenticator
  - Authy

---

### `POST /auth/verify-2fa` (Verify TOTP and finish Gmail login)

Purpose:
- Verify the 6-digit TOTP using RFC 6238
- If token purpose is `2fa-setup`:
  - set `twoFactorEnabled=true` after successful verification
- In all cases:
  - **issue access JWT** only if TOTP is valid

Body:
```json
{ "code": "123456", "twoFaToken": "..." }
```

Success:
```json
{ "ok": true, "accessToken": "..." }
```

Failure:
```json
{ "message": "Invalid authenticator code" }
```

Where:
- Controller: `verify2fa`
- Service: `verifyTwoFactor`

---

### `GET /auth/me` (Session check)

Purpose:
- Validate access token and return current user profile (safe fields only)

Headers:
```
Authorization: Bearer <accessToken>
```

Success:
```json
{
  "user": {
    "id": "...",
    "email": "user@gmail.com",
    "phone": null,
    "twoFactorEnabled": true,
    "createdAt": "..."
  }
}
```

Where:
- Controller: `me`
- Middleware: `requireAuth`

---

## OTP lifecycle (Phone login)

Implementation: `sendPhoneOtp` / `verifyPhoneOtp` in `src/services/auth.service.js`.

Rules:
- OTP is **6 digits**, generated by crypto-secure RNG (`crypto.randomInt`)
- Stored only as `bcrypt` hash
- Expires in **5 minutes**
- Max attempts per challenge: **5**
- Challenge is deleted on:
  - success
  - expiry
  - attempts exceeded

Dev-only behavior:
- OTP is logged to server console in dev mode (`NODE_ENV !== "production"`)
- Production should integrate an SMS provider and remove OTP logs.

---

## TOTP (Microsoft Authenticator) details

Implementation:
- Secret generation: `speakeasy.generateSecret()`
- Verification: `speakeasy.totp.verify({ window: 1 })`
- Secret stored:
  - base32 secret encrypted with AES-256-GCM
  - stored in DB as `twoFactorSecretEnc`

Compatibility:
- Works with Microsoft Authenticator, Google Authenticator, Authy.

Security:
- TOTP secrets are **never stored plaintext** in DB.

---

## Rate limiting strategy

File: `src/middlewares/rateLimit.middleware.js`

Current limits (can be tuned later):
- General auth: 30 requests / minute
- OTP send: 5 requests / 5 minutes
- OTP verify: 20 requests / 5 minutes

These limits are intended to reduce brute force and abuse while keeping dev UX workable.

---

## Production hardening checklist (next steps)

This implementation is production-oriented, but for real deployment you should add:

- **Phone normalization & validation** (E.164 strict parsing) and potentially per-country rules
- **Stronger account lockout policies** for email/password brute force (per IP + per account)
- **Audit logging** for auth events (login attempts, 2FA setup, 2FA verify)
- **Refresh tokens** (rotating) instead of only access tokens
- **Device/session management** (token revocation, logout everywhere)
- **CSRF strategy** if moving tokens into cookies
- **Secure secrets management** (KMS/Secret Manager), never commit `.env`
- **Database choice** (Postgres recommended for production) and Prisma migrations in CI


