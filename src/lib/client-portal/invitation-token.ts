import crypto from 'crypto';

// Jeton d'invitation au portail client : 32 octets aléatoires en base64url.
// Seule l'empreinte SHA-256 (hex) est stockée en base ; le jeton en clair ne
// vit que dans le lien envoyé au client.

export const CLIENT_PORTAL_INVITATION_TTL_DAYS = 14;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function isWellFormedInvitationToken(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_PATTERN.test(token);
}

export function hashInvitationToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export function normalizeInvitationEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function invitationExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + CLIENT_PORTAL_INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function buildInvitationUrl(base: string, token: string): string {
  const url = new URL('/invitation/portail', base);
  url.searchParams.set('token', token);
  return url.toString();
}
