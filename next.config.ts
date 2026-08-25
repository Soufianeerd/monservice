import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/**
 * En-têtes de sécurité.
 *
 * Aucun en-tête n'était défini auparavant : ni CSP, ni HSTS, ni protection
 * anti-clickjacking, ni `nosniff` (anomalie MS-024).
 *
 * La CSP autorise `'unsafe-inline'` et `'unsafe-eval'` pour les scripts, ce
 * qui est nécessaire au runtime de Next.js sans mise en place de nonces.
 * TODO(P1) : passer à une CSP à base de nonces pour supprimer `unsafe-*`.
 */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.stripe.com https://*.supabase.co http://127.0.0.1:54321 http://localhost:54321",
      'frame-src https://js.stripe.com https://hooks.stripe.com',
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Les espaces authentifiés ne doivent jamais être indexés ni mis en cache
      // par un intermédiaire partagé.
      {
        source: '/(dashboard|client|clients|deals|facturation|agenda|parametres|messages)/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/products', destination: '/facturation/produits', permanent: true },
      { source: '/products/:path*', destination: '/facturation/produits/:path*', permanent: true },
      { source: '/quotes', destination: '/facturation/devis', permanent: true },
      { source: '/quotes/:path*', destination: '/facturation/devis/:path*', permanent: true },
      { source: '/invoices', destination: '/facturation/factures', permanent: true },
      { source: '/invoices/:path*', destination: '/facturation/factures/:path*', permanent: true },
      { source: '/tasks', destination: '/agenda/taches', permanent: true },
      { source: '/tasks/:path*', destination: '/agenda/taches/:path*', permanent: true },
      { source: '/calendar', destination: '/agenda/calendrier', permanent: true },
      { source: '/profile', destination: '/parametres/profil', permanent: true },
      { source: '/settings/organization', destination: '/parametres/organisation', permanent: true },
      { source: '/settings/billing', destination: '/parametres/facturation', permanent: true },
      { source: '/notifications', destination: '/parametres/notifications', permanent: true },
      { source: '/contacts', destination: '/clients', permanent: true },
      { source: '/reports', destination: '/deals/rapports', permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
