import path from 'node:path'
import dotenv from 'dotenv'
import { z } from 'zod'

// Load from cwd (default)
dotenv.config()
// Load from monorepo root when running as workspace (clinic-brain/.env)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('clinic-brain-backend'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api'),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('30d'),
  WEBHOOK_API_KEY: z.string().min(1),
  EVOLUTION_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(1),
  EVOLUTION_INSTANCE: z.string().min(1),
  EVOLUTION_TIMEOUT_MS: z.coerce.number().default(5000),
  EVOLUTION_RETRY_ATTEMPTS: z.coerce.number().default(2),
  BOOKING_SITE_URL: z.string().url().default('http://localhost:5173'),
  SCHEDULER_ENABLED: z.coerce.boolean().default(true),
  REMINDER_CHECK_INTERVAL_MS: z.coerce.number().default(60000),
  DEFAULT_TIMEZONE: z.string().default('America/Sao_Paulo'),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional().default('http://localhost:3000/api/integrations/google/callback'),
  GOOGLE_TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(32)
    .default('change_me_google_token_encryption_key_32chars'),
  GOOGLE_SYNC_ENABLED: z.coerce.boolean().default(true),
  GOOGLE_SYNC_CHECK_INTERVAL_MS: z.coerce.number().default(30000),
  GOOGLE_SYNC_BATCH_SIZE: z.coerce.number().default(20),
  GOOGLE_SYNC_MAX_ATTEMPTS: z.coerce.number().default(6),
  GOOGLE_FRONTEND_SUCCESS_URL: z.string().url().default('http://localhost:5173/settings?google=connected'),
  GOOGLE_FRONTEND_ERROR_URL: z.string().url().default('http://localhost:5173/settings?google=error'),
  /** Emails que podem usar "Limpar dados de pacientes" (separados por vírgula). Em dev, se vazio, permite todos. */
  CLEAR_PATIENTS_ALLOWED_EMAILS: z.string().optional().default(''),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ')
  throw new Error(`Invalid environment variables: ${issues}`)
}

export const env = parsed.data
