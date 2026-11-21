import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Atténuation des abus en mémoire (best-effort single-instance abuse mitigation).
 *
 * NOTE DE SÉCURITÉ :
 * Ce limiteur en mémoire constitue une défense en profondeur contre le brute-force
 * sur une instance unique. Il ne constitue PAS une frontière de sécurité distribuée
 * en environnement multi-instances/serverless. Le contrôle d'accès primaire et
 * l'autorisation sont garantis par le contexte serveur et la base de données.
 */
const ipStore = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const MAX_STORE_ENTRIES = 5000;

function cleanupExpiredEntries(now: number) {
  if (ipStore.size <= MAX_STORE_ENTRIES) return;
  for (const [key, val] of ipStore.entries()) {
    if (now > val.resetTime) {
      ipStore.delete(key);
    }
  }
}

export function getCanonicalClientIp(request: Request | NextRequest): string {
  // Adresse fixée par l'hébergeur, que le visiteur ne peut pas falsifier
  // (Netlify : x-nf-client-connection-ip). À défaut, en-têtes génériques.
  const platformIp = request.headers.get('x-nf-client-connection-ip')?.trim();
  if (platformIp) return platformIp;
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    const trimmed = xRealIp.trim();
    if (trimmed) return trimmed;
  }
  return 'anonymous';
}

export function rateLimit(request: NextRequest, maxAttempts = MAX_ATTEMPTS, windowMs = WINDOW_MS, scope = 'default') {
  const ip = `${scope}:${getCanonicalClientIp(request)}`;
  const now = Date.now();

  cleanupExpiredEntries(now);

  const record = ipStore.get(ip);

  if (record) {
    if (now > record.resetTime) {
      ipStore.set(ip, { count: 1, resetTime: now + windowMs });
      return null;
    } else if (record.count >= maxAttempts) {
      return new NextResponse('Trop de tentatives. Réessayez plus tard.', { status: 429 });
    } else {
      record.count += 1;
      ipStore.set(ip, record);
      return null;
    }
  } else {
    ipStore.set(ip, { count: 1, resetTime: now + windowMs });
    return null;
  }
}

/**
 * Règles appliquées par le proxy aux points d'entrée sensibles (S-11) :
 * création de compte et connexion, mot de passe oublié, signature publique d'un
 * devis, dépôt d'un avis et exports. Seules les requêtes POST sont comptées.
 */
const SENSITIVE_RULES: Array<{ scope: string; match: (path: string) => boolean; max: number; windowMs: number }> = [
  { scope: 'auth-sign-up', match: (p) => p.startsWith('/api/auth/sign-up'), max: 5, windowMs: 60 * 60 * 1000 },
  { scope: 'auth-sign-in', match: (p) => p.startsWith('/api/auth/sign-in'), max: 10, windowMs: 15 * 60 * 1000 },
  { scope: 'auth-password', match: (p) => p.startsWith('/api/auth/forget-password') || p.startsWith('/api/auth/request-password-reset') || p.startsWith('/api/auth/reset-password'), max: 5, windowMs: 60 * 60 * 1000 },
  { scope: 'public-sign', match: (p) => p === '/api/quotes/sign' || p === '/api/deals/sign', max: 10, windowMs: 15 * 60 * 1000 },
  { scope: 'review', match: (p) => p === '/laisser-un-avis', max: 10, windowMs: 60 * 60 * 1000 },
  { scope: 'export', match: (p) => p.startsWith('/api/exports') || p === '/api/retention/export', max: 20, windowMs: 60 * 60 * 1000 },
];

export function sensitiveRateLimit(request: NextRequest) {
  if (request.method !== 'POST') return null;
  // Les parcours automatisés (CI, recette) créent de nombreux comptes depuis une même
  // machine. Ce réglage n'est jamais défini sur le site en ligne.
  if (process.env.RATE_LIMIT_DISABLED === 'true') return null;
  const path = request.nextUrl.pathname;
  const rule = SENSITIVE_RULES.find((candidate) => candidate.match(path));
  return rule ? rateLimit(request, rule.max, rule.windowMs, rule.scope) : null;
}

export function resetRateLimitStoreForTesting() {
  ipStore.clear();
}
