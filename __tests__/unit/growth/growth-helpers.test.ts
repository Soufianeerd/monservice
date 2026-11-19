import { describe, expect, it } from 'vitest';
import { isOpenInvoiceStatus, validatePaymentDate } from '@/lib/growth/payment';
import { buildReviewUrl, generateReviewToken, hashReviewToken, isWellFormedReviewToken, summarizeRatings } from '@/lib/growth/review';
import { isValidPublicSlug, parseList, slugify } from '@/lib/growth/public-profile';
import { isGrowthAvailable } from '@/lib/growth/availability';
import { automationSettingsSchema, publicProfileSchema, recordPaymentSchema, submitReviewSchema } from '@/lib/validation/growth.schemas';

describe('règlement saisi', () => {
  const today = new Date('2026-11-17T10:00:00Z');
  it('refuse une date future, antérieure à la facture ou mal formée', () => {
    expect(validatePaymentDate('2026-11-17', '2026-11-01', today)).toBeNull();
    expect(validatePaymentDate('2026-11-18', '2026-11-01', today)).toMatch(/futur/);
    expect(validatePaymentDate('2026-10-31', '2026-11-01T09:00:00Z', today)).toMatch(/précéder/);
    expect(validatePaymentDate('17/11/2026', '2026-11-01', today)).toMatch(/invalide/);
  });
  it('ne règle que des factures émises et ouvertes', () => {
    expect(isOpenInvoiceStatus('sent')).toBe(true);
    expect(isOpenInvoiceStatus('overdue')).toBe(true);
    for (const status of ['draft', 'paid', 'cancelled', 'superseded', 'accepted']) expect(isOpenInvoiceStatus(status)).toBe(false);
  });
  it('n’accepte pas « stripe » comme mode saisi à la main', () => {
    expect(recordPaymentSchema.safeParse({ invoiceId: 'i', paidOn: '2026-11-01', method: 'stripe' }).success).toBe(false);
    expect(recordPaymentSchema.safeParse({ invoiceId: 'i', paidOn: '2026-11-01', method: 'check' }).success).toBe(true);
  });
});

describe('avis vérifiés', () => {
  it('jeton aléatoire, seule l’empreinte est stockée', () => {
    const token = generateReviewToken();
    expect(isWellFormedReviewToken(token)).toBe(true);
    expect(generateReviewToken()).not.toBe(token);
    expect(hashReviewToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(isWellFormedReviewToken('../../etc')).toBe(false);
  });
  it('construit le lien public', () => {
    expect(buildReviewUrl('https://app.test', 'abc')).toBe('https://app.test/laisser-un-avis?token=abc');
  });
  it('moyenne au dixième, sans avis = null', () => {
    expect(summarizeRatings([])).toEqual({ count: 0, average: null });
    expect(summarizeRatings([5, 4, 4])).toEqual({ count: 3, average: 4.3 });
    expect(summarizeRatings([5, 0, 6, 2.5])).toEqual({ count: 1, average: 5 });
  });
  it('valide note, nom affiché et longueur', () => {
    const base = { token: 't', rating: 5, comment: '', displayName: 'Jean D.' };
    expect(submitReviewSchema.safeParse(base).success).toBe(true);
    expect(submitReviewSchema.safeParse({ ...base, rating: 0 }).success).toBe(false);
    expect(submitReviewSchema.safeParse({ ...base, rating: 4.5 }).success).toBe(false);
    expect(submitReviewSchema.safeParse({ ...base, displayName: '  ' }).success).toBe(false);
    expect(submitReviewSchema.safeParse({ ...base, comment: 'x'.repeat(2001) }).success).toBe(false);
  });
});

describe('vitrine', () => {
  it('dérive une adresse lisible', () => {
    expect(slugify('Plomberie Dupont & Fils — Metz')).toBe('plomberie-dupont-fils-metz');
    expect(slugify('Électricité Générale Lorraine')).toBe('electricite-generale-lorraine');
    expect(isValidPublicSlug('ab')).toBe(false);
    expect(isValidPublicSlug('plomberie-a')).toBe(true);
    expect(isValidPublicSlug('Plomberie')).toBe(false);
    expect(isValidPublicSlug('a--b')).toBe(false);
  });
  it('découpe et dédoublonne les listes saisies', () => {
    expect(parseList('Metz, Woippy\nmetz;  Thionville ,', 30)).toEqual(['Metz', 'Woippy', 'Thionville']);
    expect(parseList('a,b,c', 2)).toEqual(['a', 'b']);
  });
  it('refuse un site non https et une adresse invalide', () => {
    const base = { slug: 'plomberie-a', published: true, headline: '', about: '', serviceArea: '', interventionCities: [], services: [], showPhone: false, showEmail: false, website: '' };
    expect(publicProfileSchema.safeParse(base).success).toBe(true);
    expect(publicProfileSchema.safeParse({ ...base, website: 'javascript:alert(1)' }).success).toBe(false);
    expect(publicProfileSchema.safeParse({ ...base, website: 'http://a.test' }).success).toBe(false);
    expect(publicProfileSchema.safeParse({ ...base, slug: 'Bad Slug' }).success).toBe(false);
  });
});

describe('réglages et périmètre', () => {
  it('borne les délais', () => {
    const base = { invoiceRemindersEnabled: true, quoteFollowupsEnabled: true, quoteFollowupDays: 7, reviewRequestsEnabled: true, reviewRequestDelayDays: 3 };
    expect(automationSettingsSchema.safeParse(base).success).toBe(true);
    expect(automationSettingsSchema.safeParse({ ...base, quoteFollowupDays: 1 }).success).toBe(false);
    expect(automationSettingsSchema.safeParse({ ...base, reviewRequestDelayDays: 31 }).success).toBe(false);
  });
  it('est ouvert à tous les secteurs, santé compris', () => {
    expect(isGrowthAvailable('health')).toBe(true);
    expect(isGrowthAvailable('field_services')).toBe(true);
    expect(isGrowthAvailable(null)).toBe(true);
  });
});
