import { describe, it, expect } from 'vitest';
import { profileUpdateSchema, organizationUpdateSchema, registerSchema } from '@/lib/validation/schemas';

/**
 * Tests de non-régression — anomalie MS-004 (affectation de masse).
 *
 * Le formulaire de profil acceptait n'importe quel champ : un appelant
 * pouvait injecter `organizationId` (accès aux données d'une autre
 * entreprise), `subscriptionTier` (plan payant gratuit) ou `password`.
 */
describe('profileUpdateSchema', () => {
  it('accepte les champs légitimes', () => {
    const result = profileUpdateSchema.safeParse({ name: 'Soufiane', onboardingStep: 2 });
    expect(result.success).toBe(true);
  });

  const forbiddenFields = [
    ['organizationId', 'org-de-quelqu-un-dautre'],
    ['subscriptionTier', 'business'],
    ['subscriptionStatus', 'active'],
    ['profileType', 'professional'],
    ['password', '$2b$10$fauxhash'],
    ['email', 'attaquant@example.com'],
    ['id', 'un-autre-utilisateur'],
    ['stripeCustomerId', 'cus_123'],
  ] as const;

  it.each(forbiddenFields)('rejette le champ %s', (field, value) => {
    const result = profileUpdateSchema.safeParse({ name: 'Soufiane', [field]: value });
    expect(result.success).toBe(false);
  });
});

describe('organizationUpdateSchema', () => {
  it("rejette la modification du compte Stripe Connect", () => {
    const result = organizationUpdateSchema.safeParse({
      name: 'Mon Entreprise',
      stripeAccountId: 'acct_attaquant',
    });
    expect(result.success).toBe(false);
  });

  it('accepte les champs de présentation', () => {
    const result = organizationUpdateSchema.safeParse({ name: 'Mon Entreprise', city: 'Lyon' });
    expect(result.success).toBe(true);
  });
});

describe('registerSchema — politique de mot de passe (MS-017)', () => {
  const base = { name: 'Test', email: 'test@example.com', profileType: 'client' as const };

  it('refuse un mot de passe trop court', () => {
    expect(registerSchema.safeParse({ ...base, password: 'court' }).success).toBe(false);
  });

  it('accepte un mot de passe de 12 caractères ou plus', () => {
    expect(registerSchema.safeParse({ ...base, password: 'Motdepasse-suffisamment-long1' }).success).toBe(
      true,
    );
  });

  it('normalise l’adresse e-mail en minuscules', () => {
    const parsed = registerSchema.parse({
      ...base,
      email: '  Test@Example.COM ',
      password: 'Motdepasse-long-ok1',
    });
    expect(parsed.email).toBe('test@example.com');
  });
});
