import 'server-only';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/server';

/**
 * Limite de tentatives commune à toutes les instances du serveur
 * (public.auth_rate_limit_hit, migration 0024). La clé (e-mail, IP) est hachée :
 * rien d'identifiant n'est stocké en clair.
 *
 * Renvoie `true` si la tentative est autorisée. En cas d'indisponibilité de la
 * base, la tentative est autorisée (la limite en mémoire du proxy reste active)
 * et l'incident est journalisé.
 */
export async function allowAttempt(scope: string, key: string, max: number, windowSeconds: number): Promise<boolean> {
  if (process.env.RATE_LIMIT_DISABLED === 'true') return true;
  const normalized = key.trim().toLowerCase();
  if (!normalized) return true;
  const bucket = `${scope}:${createHash('sha256').update(normalized).digest('hex').slice(0, 40)}`;
  try {
    const rows = await db.execute<{ allowed: boolean }>(sql`select public.auth_rate_limit_hit(${bucket}, ${windowSeconds}, ${max}) as allowed`);
    const first = Array.isArray(rows) ? rows[0] : undefined;
    return first?.allowed !== false;
  } catch (error) {
    console.error('[rate-limit] compteur partagé indisponible', { scope, error: error instanceof Error ? error.message : String(error) });
    return true;
  }
}

/** Adresse IP fournie par l'hébergeur (non falsifiable sur Netlify). */
export function clientIpFrom(headers: Headers): string {
  return headers.get('x-nf-client-connection-ip')?.trim()
    || headers.get('x-real-ip')?.trim()
    || headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
}
