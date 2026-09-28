import 'server-only';
import { db } from '../db/server';
import { organizations } from '../db/schema';
import { eq } from 'drizzle-orm';
import { Organization } from '../data/interfaces';
import { generateId } from '../utils/id-generator';

/**
 * Champs modifiables par un utilisateur via l'interface.
 * Défense en profondeur derrière `organizationUpdateSchema`.
 */
const UPDATABLE_FIELDS = [
  'name',
  'slug',
  'sector',
  'industry',
  'isPublic',
  'description',
  'logo',
  'address',
  'city',
  'postalCode',
  'country',
  'phone',
  'email',
  'currency',
  'legalNotice',
  'paymentTerms',
  'bankDetails',
] as const;

export const organizationService = {
  async getById(id: string): Promise<Organization | null> {
    if (!id) return null;
    const result = await db.select().from(organizations).where(eq(organizations.id, id));
    return (result[0] as Organization) || null;
  },

  async create(data: Partial<Organization>): Promise<Organization> {
    const id = generateId();
    const now = new Date().toISOString();
    const orgName = data.name || 'Mon Entreprise';
    const slug = data.slug || `${orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id.slice(0, 8)}`;

    await db.insert(organizations).values({
      id,
      name: orgName,
      slug,
      sector: data.sector,
      profession: data.profession,
      profileType: data.profileType,
      isPublic: data.isPublic,
      description: data.description,
      logo: data.logo,
      address: data.address,
      city: data.city,
      postalCode: data.postalCode || data.zipCode,
      country: data.country,
      phone: data.phone,
      email: data.email,
      currency: data.currency,
      industry: data.industry,
      secondarySkills: data.secondarySkills,
      legalNotice: data.legalNotice,
      paymentTerms: data.paymentTerms,
      bankDetails: data.bankDetails,
      createdAt: now,
      updatedAt: now,
    });

    return this.getById(id) as Promise<Organization>;
  },

  /**
   * Mise à jour de l'organisation.
   *
   * Le contrôle d'appartenance est fait par l'appelant
   * (`organization.actions.ts` → `requireOrganization()`), et seuls les champs
   * de `UPDATABLE_FIELDS` sont écrits : ni `stripeAccountId`, ni `id`, ni
   * `profileType` ne peuvent être modifiés par ce chemin (anomalie MS-012).
   */
  async update(id: string, data: Partial<Organization>): Promise<Organization | null> {
    if (!id) return null;

    const filtered: Record<string, unknown> = {};
    for (const field of UPDATABLE_FIELDS) {
      const value = data[field as keyof Organization];
      if (value !== undefined) filtered[field] = value;
    }

    if (Object.keys(filtered).length === 0) return this.getById(id);

    filtered.updatedAt = new Date().toISOString();

    await db.update(organizations).set(filtered).where(eq(organizations.id, id));

    return this.getById(id);
  },

  /**
   * Enregistre le compte Stripe Connect associé.
   * Chemin serveur dédié, jamais exposé comme champ modifiable par l'utilisateur.
   */
  async setStripeAccount(
    id: string,
    stripeAccountId: string,
    stripeAccountStatus: string,
  ): Promise<void> {
    await db
      .update(organizations)
      .set({
        stripeAccountId,
        stripeAccountStatus,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(organizations.id, id));
  },
};
