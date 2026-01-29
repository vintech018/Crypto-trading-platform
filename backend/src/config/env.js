import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(5050),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  JWT_2FA_TTL_SECONDS: z.coerce.number().int().positive().default(300),

  ENCRYPTION_KEY_BASE64: z.string().min(1),

  FRONTEND_ORIGIN: z.string().url().default("http://localhost:5173"),
});

export const env = EnvSchema.parse(process.env);

export const isDev = env.NODE_ENV !== "production";


