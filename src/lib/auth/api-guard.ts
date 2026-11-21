import { passwordSchema } from '@/lib/validation/schemas';

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

export async function guardAuthRequest(method: string, path: string[], request: Request): Promise<Response | null> {
  if (method !== 'POST') return null;
  const [first] = path;
  if (first === 'sign-up') return json(403, 'La création de compte se fait depuis la page d’inscription.');
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
