import { AppError } from '@/lib/errors';

/** Message d'une erreur PostgreSQL, y compris enveloppée par le pilote (cause). */
export function postgresMessage(err: unknown): string {
  if (typeof err !== 'object' || err === null) return '';
  const own = 'message' in err && typeof err.message === 'string' ? err.message : '';
  const cause = 'cause' in err ? postgresMessage(err.cause) : '';
  return `${own} ${cause}`;
}

/**
 * Traduit les refus des fonctions SQL bornées en erreurs pour l'utilisateur ;
 * relance tel quel tout ce qui n'est pas prévu.
 */
export function translatePostgresError(err: unknown, known: Array<[string, AppError]>): never {
  if (err instanceof AppError) throw err;
  const message = postgresMessage(err);
  for (const [needle, appError] of known) if (message.includes(needle)) throw appError;
  throw err;
}
