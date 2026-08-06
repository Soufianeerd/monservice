import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Store IP-based attempts in memory (reste remis à zéro au redémarrage du serveur)
const ipStore = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export function rateLimit(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous';
  const now = Date.now();
  const record = ipStore.get(ip);

  if (record) {
    if (now > record.resetTime) {
      ipStore.set(ip, { count: 1, resetTime: now + WINDOW_MS });
      return null;
    } else if (record.count >= MAX_ATTEMPTS) {
      return new NextResponse('Trop de tentatives. Réessayez plus tard.', { status: 429 });
    } else {
      record.count += 1;
      ipStore.set(ip, record);
      return null;
    }
  } else {
    ipStore.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return null;
  }
}
