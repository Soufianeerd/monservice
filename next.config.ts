import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
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
  }
};

export default nextConfig;
