import type { MetadataRoute } from 'next';

/**
 * Les espaces authentifiés ne doivent jamais être indexés (anomalie MS-046).
 * Complété par l'en-tête `X-Robots-Tag` défini dans `next.config.ts`.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://monservicecrm.netlify.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pro/'],
        disallow: [
          '/dashboard',
          '/client/',
          '/clients',
          '/deals',
          '/facturation',
          '/agenda',
          '/parametres',
          '/messages',
          '/templates',
          '/marketplace',
          '/search',
          '/activity',
          '/settings',
          '/api/',
          '/auth/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
