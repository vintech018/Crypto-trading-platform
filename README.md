# Crypto Trading Platform

Monorepo containing:

- **Frontend**: React + TypeScript + Vite (repo root)
- **Backend**: Node.js + Express + Prisma (`./backend`)

## Run locally

### Backend

```bash
cd backend
npm install
# create backend/.env (see backend/README.md)
npx prisma migrate dev
node src/server.js
```

### Frontend

```bash
npm install
npm run dev
```

## Authentication

See `backend/AUTHENTICATION.md` for the full backend auth design:

- Phone OTP (free; OTP logged only in dev mode)
- Email/password login gated by TOTP 2FA (Microsoft Authenticator compatible)


