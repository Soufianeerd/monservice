import { AppError } from '@/lib/errors';

/**
 * Périmètre V1 : MonService est réservé aux professionnels et à leurs
 * collaborateurs. Les comptes client/patient (inscription « particulier »,
 * portails `/client/*`, invitation au portail, signature en ligne) sont
 * fermés tant que `CLIENT_ACCESS_ENABLED` ne vaut pas exactement `true`.
 *
 * La variable est lue côté serveur à l'exécution : elle n'est jamais exposée
 * au navigateur et le défaut est fermé. Le code des portails est conservé
 * pour la version suivante ; il reste exercé par la CI, qui active
 * l'indicateur sur sa branche jetable.
 */
export const CLIENT_ACCESS_UNAVAILABLE_PATH = '/acces-clients';

export const CLIENT_ACCESS_CLOSED_MESSAGE =
  "MonService est pour l'instant réservé aux professionnels. Les espaces clients ouvriront dans une prochaine version.";

export function parseClientAccessFlag(raw: string | null | undefined): boolean {
  return typeof raw === 'string' && raw.trim().toLowerCase() === 'true';
}

export function isClientAccessEnabled(): boolean {
  return parseClientAccessFlag(process.env.CLIENT_ACCESS_ENABLED);
}

/** Garde serveur des actions qui ouvrent ou préparent un accès client. */
export function assertClientAccessEnabled(): void {
  if (!isClientAccessEnabled()) {
    throw new AppError(CLIENT_ACCESS_CLOSED_MESSAGE, 403, 'CLIENT_ACCESS_DISABLED');
  }
}
