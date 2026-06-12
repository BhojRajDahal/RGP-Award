import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DB_HOST: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('60m'),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().int().positive().default(14),
  ALLOWED_ORIGINS: z.string().min(1, 'ALLOWED_ORIGINS is required'),
  FRONTEND_URL: z.string().url(),
  LOG_LEVEL: z.string().default('info'),
  REDIS_URL: z.string().url().optional(),
  COOKIE_SECURE: z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    return val === 'true' || val === '1';
  }, z.boolean().optional()),
  AUTH_LOGIN_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  AUTH_LOGIN_MAX: z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, z.number().int().positive().optional()),
  AUTH_RESET_PASSWORD_WINDOW_MS: z.coerce.number().int().positive().default(60 * 60 * 1000),
  AUTH_RESET_PASSWORD_MAX: z.preprocess((val) => {
    if (val === undefined || val === '') return undefined;
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, z.number().int().positive().optional()),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${message}`);
}

export const env = parsed.data;

export const cookieBaseOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};
