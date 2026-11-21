import 'server-only';
import { cookies } from 'next/headers';
import { signVerification, verificationMatches } from './crypto';

/** Preuve que le second facteur a été vérifié pour CETTE session de connexion. */
export const TWO_FACTOR_COOKIE = 'monservice_2fa';
const TTL_SECONDS = 12 * 60 * 60;

/** Jeton de session Neon Auth (le nom porte le préfixe __Secure- en HTTPS). */
export async function currentSessionToken(): Promise<string | null> {
  const store = await cookies();
  const cookie = store.getAll().find((candidate) => candidate.name.endsWith('neon-auth.session_token'));
  return cookie?.value || null;
}

export async function hasVerifiedSecondFactor(userId: string): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(TWO_FACTOR_COOKIE)?.value;
  const sessionToken = await currentSessionToken();
  if (!raw || !sessionToken) return false;
  const [expiresRaw, signature] = raw.split('.');
  const expiresAt = Number(expiresRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt * 1000 < Date.now() || !signature) return false;
  try {
    return verificationMatches(userId, sessionToken, expiresAt, signature);
  } catch {
    // Clé absente ou invalide : on refuse (échec fermé).
    return false;
  }
}

/** À appeler depuis une Server Action, après un code valide. */
export async function markSecondFactorVerified(userId: string): Promise<void> {
  const sessionToken = await currentSessionToken();
  if (!sessionToken) throw new Error('No session to bind the second factor to');
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const store = await cookies();
  store.set(TWO_FACTOR_COOKIE, `${expiresAt}.${signVerification(userId, sessionToken, expiresAt)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  });
}

export async function clearSecondFactor(): Promise<void> {
  const store = await cookies();
  store.delete(TWO_FACTOR_COOKIE);
}
