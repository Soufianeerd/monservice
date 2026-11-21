import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/**
 * En-têtes de sécurité.
 *
 * Aucun en-tête n'était défini auparavant : ni CSP, ni HSTS, ni protection
 * anti-clickjacking, ni `nosniff` (anomalie MS-024).
 *
 * La Content-Security-Policy est posée par requête dans `src/proxy.ts`
 * (nonce, sans 'unsafe-inline' ni 'unsafe-eval' pour les scripts).
 */
const securityHeaders = [
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
        source: '/(dashboard|client|clients|deals|facturation|agenda|parametres|messages|patients|operations|marketplace|templates|activity|search|settings|admin|devis|invitation|acces-clients|laisser-un-avis|avis-clients|api)/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
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
      { source: '/settings/reminders', destination: '/parametres/relances', permanent: true },
      { source: '/notifications', destination: '/parametres/notifications', permanent: true },
      { source: '/contacts', destination: '/clients', permanent: true },
      { source: '/reports', destination: '/deals/rapports', permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
