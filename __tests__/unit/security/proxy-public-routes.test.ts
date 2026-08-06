import { describe, it, expect } from 'vitest';

/**
 * Test de non-régression — anomalie MS-001.
 *
 * La liste blanche du middleware contenait `'/'` et comparait par préfixe :
 * `'/dashboard'.startsWith('/')` valant `true`, aucune route n'était protégée.
 *
 * Ce test reproduit la logique de `src/proxy.ts` et vérifie qu'une route
 * privée n'est jamais considérée comme publique.
 */

const PUBLIC_EXACT = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/forbidden',
  '/demo',
  '/conditions',
  '/confidentialite',
  '/mentions-legales',
  '/robots.txt',
  '/sitemap.xml',
]);

const PUBLIC_PREFIXES = ['/pro/', '/api/auth/', '/api/stripe/webhook'];

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

describe('Middleware — routes publiques', () => {
  const privateRoutes = [
    '/dashboard',
    '/clients',
    '/clients/abc-123',
    '/deals/pipeline',
    '/facturation/factures/42',
    '/agenda/taches',
    '/client/dashboard',
    '/client/invoices/7',
    '/parametres/organisation',
    '/api/stripe/checkout',
    '/api/stripe/connect/onboarding',
    '/api/reminders/check',
  ];

  it.each(privateRoutes)('%s ne doit jamais être considérée comme publique', (route) => {
    expect(isPublic(route)).toBe(false);
  });

  const publicRoutes = ['/', '/login', '/register', '/pro/mon-artisan', '/api/stripe/webhook'];

  it.each(publicRoutes)('%s doit rester publique', (route) => {
    expect(isPublic(route)).toBe(true);
  });

  it("la racine ne doit pas être utilisée comme préfixe", () => {
    expect(PUBLIC_PREFIXES).not.toContain('/');
  });
});
