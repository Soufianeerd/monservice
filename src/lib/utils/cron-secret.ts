import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Compare l'en-tête `x-cron-secret` au secret configuré en temps constant.
 * Les deux valeurs sont hachées pour obtenir des tampons de même longueur,
 * sans révéler la longueur du secret attendu. Un secret absent ou vide
 * n'autorise jamais l'appel.
 */
export function isValidCronSecret(provided: string | null, expected: string | undefined): boolean {
  if (!expected || expected.length === 0 || provided === null) return false;
  const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest();
  return timingSafeEqual(digest(provided), digest(expected));
}
