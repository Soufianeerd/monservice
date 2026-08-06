import type { MetadataRoute } from 'next';

/** Seules les pages publiques figurent au sitemap. */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://monservicecrm.netlify.app';
  const lastModified = new Date();

  return [
    { url: baseUrl, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/register`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/login`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/demo`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/conditions`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/confidentialite`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/mentions-legales`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
