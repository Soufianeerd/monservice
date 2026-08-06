import 'server-only';
import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';

/**
 * Convertit une exception en réponse HTTP.
 *
 * Deux règles :
 *  - un `AppError` porte un statut et un message destinés à l'utilisateur ;
 *  - toute autre exception renvoie un message générique. Le détail reste
 *    dans les journaux serveur et n'est jamais exposé au client (pas de
 *    stack trace, pas de message d'ORM, pas de nom de table).
 */
export function toErrorResponse(error: unknown, fallbackMessage = 'Une erreur est survenue') {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode },
    );
  }

  console.error('[api] erreur non gérée', error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
