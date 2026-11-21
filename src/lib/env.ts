import 'server-only';
import { z } from 'zod';

/** Fail at startup when the managed Auth, restricted DB or private storage
 * configuration is missing. Provider credentials remain server-only. */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL est requise')
    .startsWith('postgres', 'DATABASE_URL doit pointer vers PostgreSQL'),

  NEON_AUTH_BASE_URL: z.string().url(),
  NEON_AUTH_COOKIE_SECRET: z.string().min(32),
  // Stockage privé : noms NEON_STORAGE_* (obligatoires sur Netlify) ou AWS_*.
  NEON_STORAGE_ENDPOINT: z.string().url().optional(),
  NEON_STORAGE_REGION: z.string().min(1).optional(),
  NEON_STORAGE_ACCESS_KEY_ID: z.string().min(1).optional(),
  NEON_STORAGE_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  AWS_ENDPOINT_URL_S3: z.string().url().optional(),
  AWS_REGION: z.string().min(1).optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),

  // Stripe est optionnel : l'application doit démarrer sans, avec les
  // fonctionnalités de paiement désactivées (503).
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_BUSINESS: z.string().optional(),

  CRON_SECRET: z.string().min(16).optional(),

  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
}).refine(
  (env) => Boolean((env.NEON_STORAGE_ENDPOINT || env.AWS_ENDPOINT_URL_S3) && (env.NEON_STORAGE_REGION || env.AWS_REGION)
    && (env.NEON_STORAGE_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID) && (env.NEON_STORAGE_SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY)),
  { message: 'Configuration du stockage privé incomplète (NEON_STORAGE_* ou AWS_*)' },
);

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuration d'environnement invalide :\n${details}`);
  }

  cached = parsed.data;
  return cached;
}
