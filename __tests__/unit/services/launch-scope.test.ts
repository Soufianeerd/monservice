import { afterEach, describe, expect, it, vi } from 'vitest';
import { getEffectivePlan, parseLaunchIncludedPlan, PLANS } from '@/lib/billing/plans';
import { assertClientAccessEnabled, isClientAccessEnabled, parseClientAccessFlag } from '@/lib/launch/client-access';
import { recordQuoteDecisionSchema } from '@/lib/validation/billing.schemas';
import { AppError } from '@/lib/errors';

afterEach(() => { vi.unstubAllEnvs(); });

describe('Périmètre V1 — espaces clients fermés par défaut', () => {
  it('reste fermé sans variable, et pour toute valeur autre que « true »', () => {
    vi.stubEnv('CLIENT_ACCESS_ENABLED', '');
    expect(isClientAccessEnabled()).toBe(false);
    for (const value of [undefined, null, '', '1', 'yes', 'on', 'false', 'truthy']) {
      expect(parseClientAccessFlag(value)).toBe(false);
    }
    expect(parseClientAccessFlag('true')).toBe(true);
    expect(parseClientAccessFlag(' TRUE ')).toBe(true);
  });

  it('refuse côté serveur avec un code stable quand l’accès est fermé', () => {
    vi.stubEnv('CLIENT_ACCESS_ENABLED', 'false');
    try {
      assertClientAccessEnabled();
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(403);
      expect((error as AppError).code).toBe('CLIENT_ACCESS_DISABLED');
    }
    vi.stubEnv('CLIENT_ACCESS_ENABLED', 'true');
    expect(() => assertClientAccessEnabled()).not.toThrow();
  });
});

describe('Offre de lancement — plan inclus sans abonnement', () => {
  it('applique le plan gratuit quand rien n’est configuré', () => {
    vi.stubEnv('LAUNCH_INCLUDED_PLAN', '');
    expect(getEffectivePlan('pro', 'canceled')).toBe(PLANS.free);
    expect(getEffectivePlan(null, null)).toBe(PLANS.free);
    expect(getEffectivePlan('pro', 'active')).toBe(PLANS.pro);
  });

  it('accorde le plan inclus aux comptes sans abonnement actif', () => {
    vi.stubEnv('LAUNCH_INCLUDED_PLAN', 'pro');
    expect(getEffectivePlan('free', null)).toBe(PLANS.pro);
    expect(getEffectivePlan('starter', 'past_due')).toBe(PLANS.pro);
  });

  it('ne dégrade jamais un abonnement supérieur et relève un abonnement inférieur', () => {
    vi.stubEnv('LAUNCH_INCLUDED_PLAN', 'pro');
    expect(getEffectivePlan('business', 'active')).toBe(PLANS.business);
    expect(getEffectivePlan('starter', 'active')).toBe(PLANS.pro);
  });

  it('ignore une valeur inconnue', () => {
    expect(parseLaunchIncludedPlan('enterprise')).toBe('free');
    expect(parseLaunchIncludedPlan(' Pro ')).toBe('pro');
    expect(parseLaunchIncludedPlan(undefined)).toBe('free');
  });
});

describe('Décision du client consignée par le professionnel', () => {
  const base = { quoteId: 'q1', decision: 'accepted', method: 'in_person', decidedOn: '2026-11-01' } as const;

  it('accepte un accord daté dans le passé avec un mode de réception connu', () => {
    expect(recordQuoteDecisionSchema.safeParse(base).success).toBe(true);
    expect(recordQuoteDecisionSchema.safeParse({ ...base, decision: 'rejected', method: 'phone', note: 'Budget reporté' }).success).toBe(true);
  });

  it('refuse une date future, mal formée ou inexistante', () => {
    expect(recordQuoteDecisionSchema.safeParse({ ...base, decidedOn: '2999-01-01' }).success).toBe(false);
    expect(recordQuoteDecisionSchema.safeParse({ ...base, decidedOn: '01/11/2026' }).success).toBe(false);
    expect(recordQuoteDecisionSchema.safeParse({ ...base, decidedOn: '2026-13-40' }).success).toBe(false);
  });

  it('refuse un mode inconnu, une décision inconnue et tout champ supplémentaire', () => {
    expect(recordQuoteDecisionSchema.safeParse({ ...base, method: 'sms' }).success).toBe(false);
    expect(recordQuoteDecisionSchema.safeParse({ ...base, decision: 'paid' }).success).toBe(false);
    expect(recordQuoteDecisionSchema.safeParse({ ...base, organizationId: 'other-org' }).success).toBe(false);
  });
});
