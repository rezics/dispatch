import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    PORT: z.coerce.number().default(3721),
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    REAPER_INTERVAL: z.string().default('30s'),
    AGING_SWEEPER_INTERVAL: z.string().default('300s'),
    DISPATCH_DISABLE_DASHBOARD: z
      .string()
      .default('false')
      .transform((v) => v === 'true'),
    DISPATCH_AUTH_JWKS_URI: z.string().url().optional(),
    DISPATCH_AUTH_ISSUER: z.string().optional(),
    DISPATCH_AUTH_AUDIENCE: z.string().optional(),
    DISPATCH_RECEIPT_SECRET: z.string().optional(),
    DISPATCH_SEED_REZICS: z
      .string()
      .default('false')
      .transform((v) => v === 'true'),
  },
  runtimeEnv: process.env,
})
