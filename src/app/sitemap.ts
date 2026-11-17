import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { listPublicProfessionalSlugs } from '@/lib/services/public-profile.service';

/** Seules les pages publiques figurent au sitemap, vitrines publiées comprises. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Les vitrines changent : calcul à chaque requête, jamais au build.
  await connection();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://monservicecrm.netlify.app';
  const lastModified = new Date();

  let professionals: MetadataRoute.Sitemap = [];
  try {
    professionals = (await listPublicProfessionalSlugs()).map(({ slug, updatedAt }) => ({
      url: `${baseUrl}/pro/${slug}`,
      lastModified: updatedAt ? new Date(updatedAt) : lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (error) {
    // Le sitemap reste servi même si la base est momentanément indisponible.
    console.error('[sitemap] vitrines indisponibles', error);
  }

  return [
    { url: baseUrl, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/register`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/login`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/demo`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/conditions`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/confidentialite`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/mentions-legales`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    ...professionals,
  ];
}
