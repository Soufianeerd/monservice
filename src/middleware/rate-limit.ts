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

export function rateLimit(request: NextRequest, maxAttempts = MAX_ATTEMPTS, windowMs = WINDOW_MS) {
  const ip = getCanonicalClientIp(request);
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

export function resetRateLimitStoreForTesting() {
  ipStore.clear();
}
