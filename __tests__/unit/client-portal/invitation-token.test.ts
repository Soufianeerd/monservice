import { describe, expect, it } from 'vitest';
import {
  buildInvitationUrl,
  CLIENT_PORTAL_INVITATION_TTL_DAYS,
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiry,
  isWellFormedInvitationToken,
  normalizeInvitationEmail,
} from '@/lib/client-portal/invitation-token';
import { clientPortalTokenSchema, createClientPortalInvitationSchema } from '@/lib/validation/client-portal-invitation.schemas';

describe('client portal invitation tokens', () => {
  it('generates unique 256-bit url-safe tokens', () => {
    const tokens = new Set(Array.from({ length: 50 }, generateInvitationToken));
    expect(tokens.size).toBe(50);
    for (const token of tokens) expect(isWellFormedInvitationToken(token)).toBe(true);
  });

  it('stores only a sha-256 hex digest matching the database check', () => {
    const digest = hashInvitationToken('abc');
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('rejects malformed tokens', () => {
    for (const bad of [undefined, '', 'short', 'a'.repeat(44), `${'a'.repeat(42)}=`, ['x']]) {
      expect(isWellFormedInvitationToken(bad)).toBe(false);
    }
    expect(clientPortalTokenSchema.safeParse({ token: 'nope' }).success).toBe(false);
    expect(clientPortalTokenSchema.safeParse({ token: generateInvitationToken() }).success).toBe(true);
  });

  it('normalizes emails like the database check', () => {
    expect(normalizeInvitationEmail('  Client@Exemple.FR ')).toBe('client@exemple.fr');
    expect(createClientPortalInvitationSchema.safeParse({ clientId: 'c1', email: 'pas-un-email' }).success).toBe(false);
    expect(createClientPortalInvitationSchema.safeParse({ clientId: 'c1' }).success).toBe(true);
  });

  it('expires after the configured delay and builds a public link', () => {
    const now = new Date('2026-11-10T10:00:00Z');
    expect(invitationExpiry(now).getTime() - now.getTime()).toBe(CLIENT_PORTAL_INVITATION_TTL_DAYS * 86400000);
    const url = new URL(buildInvitationUrl('https://app.monservice.test/ignored', 'tok_en-1'));
    expect(url.origin).toBe('https://app.monservice.test');
    expect(url.pathname).toBe('/invitation/portail');
    expect(url.searchParams.get('token')).toBe('tok_en-1');
  });
});
