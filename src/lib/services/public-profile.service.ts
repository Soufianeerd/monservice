import 'server-only';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { organizationPortfolioItems, organizationPublicProfiles, organizations } from '@/lib/db/schema';
import { AppError } from '@/lib/errors';
import { slugify } from '@/lib/growth/public-profile';
import { translatePostgresError } from '@/lib/utils/postgres-error';

// Vitrine publique (migration 0020). Écriture par l'administrateur via des
// fonctions bornées ; lecture publique sans session via public_professional_*,
// qui ne renvoient que les vitrines publiées et les champs choisis.

const KNOWN_ERRORS: Array<[string, AppError]> = [
  ['Organization admin required', new AppError('Seul un administrateur de l’organisation peut modifier la vitrine.', 403, 'TEAM_ADMIN_REQUIRED')],
  ['Public profile unavailable for this sector', new AppError('La vitrine publique n’est pas disponible pour ce secteur.', 403, 'SECTOR_UNAVAILABLE')],
  ['organization_public_profiles_slug_unique', new AppError('Cette adresse est déjà prise. Choisissez-en une autre.', 409, 'SLUG_TAKEN')],
  ['organization_public_profiles_slug_check', new AppError('Adresse invalide : lettres minuscules, chiffres et tirets, 3 à 60 caractères.', 400, 'INVALID_SLUG')],
  ['organization_public_profiles_website_check', new AppError('Le site web doit commencer par https://', 400, 'INVALID_WEBSITE')],
  ['Portfolio limit reached', new AppError('30 réalisations au plus.', 409, 'PORTFOLIO_LIMIT')],
  ['Portfolio item not found', new AppError('Réalisation introuvable.', 404, 'PORTFOLIO_NOT_FOUND')],
  ['organization_portfolio_items_title_check', new AppError('Donnez un titre à la réalisation (120 caractères au plus).', 400, 'INVALID_TITLE')],
];

export type OwnPublicProfile = {
  slug: string;
  published: boolean;
  headline: string;
  about: string;
  serviceArea: string;
  interventionCities: string[];
  services: string[];
  showPhone: boolean;
  showEmail: boolean;
  website: string;
  exists: boolean;
};

export type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  completedOn: string | null;
  position: number;
};

export type PublicProfessional = {
  slug: string;
  name: string;
  headline: string | null;
  about: string | null;
  serviceArea: string | null;
  interventionCities: string[];
  services: string[];
  city: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  sector: string | null;
  profession: string | null;
  reviewCount: number;
  ratingAverage: number | null;
  updatedAt: string;
  reviews: Array<{ author: string; rating: number; comment: string | null; createdAt: string; reply: string | null }>;
  portfolio: Array<{ title: string; description: string | null; city: string | null; completedOn: string | null }>;
};

export async function getOwnPublicProfile(organizationId: string): Promise<OwnPublicProfile> {
  const [row] = await db.select().from(organizationPublicProfiles).where(eq(organizationPublicProfiles.organizationId, organizationId)).limit(1);
  if (row) {
    return {
      slug: row.slug,
      published: row.published,
      headline: row.headline ?? '',
      about: row.about ?? '',
      serviceArea: row.serviceArea ?? '',
      interventionCities: row.interventionCities,
      services: row.services,
      showPhone: row.showPhone,
      showEmail: row.showEmail,
      website: row.website ?? '',
      exists: true,
    };
  }
  const [org] = await db.select({ name: organizations.name, description: organizations.description, city: organizations.city })
    .from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  return {
    slug: slugify(`${org?.name ?? ''} ${org?.city ?? ''}`.trim()),
    published: false,
    headline: '',
    about: org?.description ?? '',
    serviceArea: '',
    interventionCities: org?.city ? [org.city] : [],
    services: [],
    showPhone: false,
    showEmail: false,
    website: '',
    exists: false,
  };
}

export async function savePublicProfile(input: Omit<OwnPublicProfile, 'exists'>): Promise<void> {
  try {
    await db.execute(sql`select public.save_public_profile(
      ${input.slug}, ${input.published}, ${input.headline}, ${input.about}, ${input.serviceArea},
      ${sql`${toTextArray(input.interventionCities)}::text[]`}, ${sql`${toTextArray(input.services)}::text[]`},
      ${input.showPhone}, ${input.showEmail}, ${input.website})`);
  } catch (err) {
    translatePostgresError(err, KNOWN_ERRORS);
  }
}

/** Littéral de tableau PostgreSQL, chaque élément échappé. */
function toTextArray(values: string[]): string {
  return `{${values.map((value) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')}}`;
}

export async function listPortfolio(organizationId: string): Promise<PortfolioItem[]> {
  const rows = await db.select().from(organizationPortfolioItems)
    .where(eq(organizationPortfolioItems.organizationId, organizationId))
    .orderBy(asc(organizationPortfolioItems.position), desc(organizationPortfolioItems.createdAt));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    city: row.city,
    completedOn: row.completedOn,
    position: row.position,
  }));
}

export async function savePortfolioItem(input: { id?: string | null; title: string; description?: string | null; city?: string | null; completedOn?: string | null; position?: number }): Promise<string> {
  try {
    const rows = await db.execute(sql`select public.save_portfolio_item(
      ${input.id ?? null}, ${input.title}, ${input.description ?? null}, ${input.city ?? null},
      ${input.completedOn ?? null}::date, ${input.position ?? 0}) as id`);
    return String(rows[0]?.id ?? '');
  } catch (err) {
    translatePostgresError(err, KNOWN_ERRORS);
  }
}

export async function deletePortfolioItem(id: string): Promise<void> {
  try {
    await db.execute(sql`select public.delete_portfolio_item(${id})`);
  } catch (err) {
    translatePostgresError(err, KNOWN_ERRORS);
  }
}

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return typeof value === 'string' ? value : '';
}

function asDay(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return typeof value === 'string' && value ? value.slice(0, 10) : null;
}

function asTextArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

/** Vitrine publiée, sans session. */
export async function getPublicProfessional(slug: string): Promise<PublicProfessional | null> {
  const normalized = slug.toLowerCase();
  if (!/^[a-z0-9-]{3,60}$/.test(normalized)) return null;
  const [profileRows, reviewRows, portfolioRows] = await Promise.all([
    db.execute(sql`select * from public.public_professional_profile(${normalized})`),
    db.execute(sql`select * from public.public_professional_reviews(${normalized}, 50)`),
    db.execute(sql`select * from public.public_professional_portfolio(${normalized})`),
  ]);
  const row = profileRows[0];
  if (!row) return null;
  return {
    slug: normalized,
    name: String(row.name ?? ''),
    headline: asText(row.headline),
    about: asText(row.about),
    serviceArea: asText(row.service_area),
    interventionCities: asTextArray(row.intervention_cities),
    services: asTextArray(row.services),
    city: asText(row.city),
    postalCode: asText(row.postal_code),
    phone: asText(row.phone),
    email: asText(row.email),
    website: asText(row.website),
    sector: asText(row.sector),
    profession: asText(row.profession),
    reviewCount: Number(row.review_count ?? 0),
    ratingAverage: row.rating_average == null ? null : Number(row.rating_average),
    updatedAt: asIso(row.updated_at),
    reviews: reviewRows.map((review) => ({
      author: String(review.author ?? ''),
      rating: Number(review.rating),
      comment: asText(review.comment),
      createdAt: asIso(review.created_at),
      reply: asText(review.reply),
    })),
    portfolio: portfolioRows.map((item) => ({
      title: String(item.title ?? ''),
      description: asText(item.description),
      city: asText(item.city),
      completedOn: asDay(item.completed_on),
    })),
  };
}

export async function listPublicProfessionalSlugs(): Promise<Array<{ slug: string; updatedAt: string }>> {
  const rows = await db.execute(sql`select * from public.list_public_professional_slugs()`);
  return rows.map((row) => ({ slug: String(row.slug), updatedAt: asIso(row.updated_at) }));
}
