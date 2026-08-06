import 'server-only';

/**
 * Adresse IP de l'appelant, telle que transmise par le proxy de l'hébergeur.
 *
 * Utilisée pour la traçabilité des actions sensibles (signature, paiement).
 * À ne jamais utiliser comme mécanisme d'authentification : un en-tête
 * `x-forwarded-for` est falsifiable si aucun proxy de confiance ne le réécrit.
 */
export function getRequestIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'inconnue';
  return req.headers.get('x-real-ip') ?? req.headers.get('x-nf-client-connection-ip') ?? 'inconnue';
}

export function getUserAgent(req: Request): string {
  return req.headers.get('user-agent') ?? 'inconnu';
}
