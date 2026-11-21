import { passwordSchema } from '@/lib/validation/schemas';
import { allowAttempt, clientIpFrom } from './shared-rate-limit';

/**
 * Contrôles appliqués au relais public /api/auth/* avant transmission à Neon Auth.
 *
 * - La création de compte passe uniquement par nos actions serveur, qui vérifient
 *   la politique de mot de passe, le secteur et provisionnent l'organisation :
 *   l'appel direct au fournisseur est refusé.
 * - Tout nouveau mot de passe (réinitialisation, changement) doit respecter la
 *   même politique que l'inscription, vérifiée ici côté serveur.
 */
const PASSWORD_ENDPOINTS: Record<string, string> = {
  'reset-password': 'newPassword',
  'change-password': 'newPassword',
};

function json(status: number, message: string): Response {
  return Response.json({ code: 'FORBIDDEN_BY_POLICY', message }, { status });
}

async function readEmail(request: Request): Promise<string | null> {
  try {
    const body: unknown = await request.clone().json();
    const email: unknown = body && typeof body === 'object' ? Reflect.get(body, 'email') : undefined;
    return typeof email === 'string' ? email : null;
  } catch {
    return null;
  }
}

export async function guardAuthRequest(method: string, path: string[], request: Request): Promise<Response | null> {
  if (method !== 'POST') return null;
  const [first] = path;
  if (first === 'sign-up') return json(403, 'La création de compte se fait depuis la page d’inscription.');

  // Limites partagées par toutes les instances : par compte (blocage temporaire
  // après trop d'échecs ou de demandes) et par adresse IP.
  if (first === 'sign-in' || first === 'forget-password' || first === 'request-password-reset') {
    const email = await readEmail(request);
    const ip = clientIpFrom(request.headers);
    const perAccount = first === 'sign-in' ? { max: 10, window: 15 * 60 } : { max: 5, window: 60 * 60 };
    const [accountOk, ipOk] = await Promise.all([
      email ? allowAttempt(`${first}:email`, email, perAccount.max, perAccount.window) : Promise.resolve(true),
      allowAttempt(`${first}:ip`, ip, 30, 15 * 60),
    ]);
    if (!accountOk || !ipOk) {
      return json(429, first === 'sign-in'
        ? 'Trop de tentatives de connexion. Par sécurité, réessayez dans 15 minutes.'
        : 'Trop de demandes. Réessayez dans une heure.');
    }
    return null;
  }
  const field = first ? PASSWORD_ENDPOINTS[first] : undefined;
  if (!field) return null;
  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
    return json(400, 'Requête invalide.');
  }
  const value: unknown = body && typeof body === 'object' ? Reflect.get(body, field) : undefined;
  const parsed = passwordSchema.safeParse(value);
  if (!parsed.success) return json(400, parsed.error.issues[0]?.message ?? 'Mot de passe non conforme.');
  return null;
}
