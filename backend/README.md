## Backend (Node.js + Express)

### Environment variables

Create `backend/.env` with:

```bash
PORT=5050
NODE_ENV=development

# Prisma (SQLite for dev)
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="replace-me-with-a-long-random-secret"
JWT_ACCESS_TTL_SECONDS=3600
JWT_2FA_TTL_SECONDS=300

# Encryption key for storing TOTP secrets (32 bytes base64)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
ENCRYPTION_KEY_BASE64="replace-me"

# CORS
FRONTEND_ORIGIN="http://localhost:5173"
```

