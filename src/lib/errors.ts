/**
 * Erreurs applicatives — sans aucune dépendance client.
 *
 * `AppError` était auparavant déclarée dans `utils/error-handler.ts`, qui
 * importe `react-hot-toast`. Toute route API ou service qui l'importait
 * embarquait donc une dépendance navigateur côté serveur.
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
