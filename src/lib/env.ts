import 'server-only';
import { z } from 'zod';

/**
 * Validation des variables d'environnement au démarrage.
 *
 * Les helpers Supabase lisaient auparavant une variable (`...ANON_KEY`) que
 * `.env.production` ne définissait pas : l'assertion `!` masquait le problème
 * au typage et, en production, chaque page authentifiée renvoyait 500
 * (anomalie MS-009).
 *
 * Un démarrage qui échoue bruyamment vaut mieux qu'une erreur 500 silencieuse.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL est requise')
    .startsWith('postgres', 'DATABASE_URL doit pointer vers PostgreSQL'),

  // Supabase Auth est la source d'identité : aucun secret d'authentification
  // applicatif n'est nécessaire côté serveur.
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL doit être une URL valide'),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(20, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY est requise'),

  // Stripe est optionnel : l'application doit démarrer sans, avec les
  // fonctionnalités de paiement désactivées (503).
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_BUSINESS: z.string().optional(),

  CRON_SECRET: z.string().min(16).optional(),

  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

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
