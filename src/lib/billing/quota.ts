import 'server-only';
import { db } from '@/lib/db/server';
import { clients, invoices, products, users } from '@/lib/db/schema';
import { and, eq, gte, sql } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { getEffectivePlan, type Plan, type PlanFeatures } from './plans';
import type { OrganizationContext } from '@/lib/auth/session';

/**
 * Application des quotas et des droits par plan.
 *
 * Le contrôle est fait CÔTÉ SERVEUR, au moment de l'écriture. Masquer un
 * bouton dans l'interface ne protège rien : les server actions sont des
 * endpoints appelables directement.
 */

export type QuotaResource = 'clients' | 'quotesPerMonth' | 'invoicesPerMonth' | 'products';

/** Plan effectif de l'utilisateur, lu depuis la base. */
export async function getUserPlan(userId: string): Promise<Plan> {
  const rows = await db
    .select({
      tier: users.subscriptionTier,
      status: users.subscriptionStatus,
    })
    .from(users)
    .where(eq(users.id, userId));

  return getEffectivePlan(rows[0]?.tier, rows[0]?.status);
}

/** Premier jour du mois courant, au format ISO (les dates sont stockées en texte). */
function startOfMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Consommation actuelle d'une ressource pour une organisation. */
export async function getUsage(
  organizationId: string,
  resource: QuotaResource,
): Promise<number> {
  const count = sql<number>`count(*)::int`;

  switch (resource) {
    case 'clients': {
      const r = await db
        .select({ value: count })
        .from(clients)
        .where(eq(clients.organizationId, organizationId));
      return r[0]?.value ?? 0;
    }
    case 'products': {
      const r = await db
        .select({ value: count })
        .from(products)
        .where(eq(products.organizationId, organizationId));
      return r[0]?.value ?? 0;
    }
    case 'quotesPerMonth': {
      const r = await db
        .select({ value: count })
        .from(invoices)
        .where(
          and(
            eq(invoices.organizationId, organizationId),
            eq(invoices.type, 'quote'),
            gte(invoices.createdAt, startOfMonthIso()),
          ),
        );
      return r[0]?.value ?? 0;
    }
    case 'invoicesPerMonth': {
      const r = await db
        .select({ value: count })
        .from(invoices)
        .where(
          and(
            eq(invoices.organizationId, organizationId),
            eq(invoices.type, 'invoice'),
            gte(invoices.createdAt, startOfMonthIso()),
          ),
        );
      return r[0]?.value ?? 0;
    }
  }
}

const RESOURCE_LABELS: Record<QuotaResource, string> = {
  clients: 'clients',
  quotesPerMonth: 'devis ce mois-ci',
  invoicesPerMonth: 'factures ce mois-ci',
  products: 'produits',
};

/**
 * Vérifie qu'une création est possible dans les limites du plan.
 * Lève une `AppError` 402 (Payment Required) sinon.
 */
export async function assertQuota(
  ctx: OrganizationContext,
  resource: QuotaResource,
): Promise<void> {
  const plan = await getUserPlan(ctx.userId);
  const limit = plan.limits[resource];

  if (limit === null) return; // illimité

  const used = await getUsage(ctx.organizationId, resource);

  if (used >= limit) {
    throw new AppError(
      `Limite atteinte : ${limit} ${RESOURCE_LABELS[resource]} sur le plan ${plan.name}. ` +
        `Passez à un plan supérieur pour continuer.`,
      402,
      'QUOTA_EXCEEDED',
    );
  }
}

/**
 * Vérifie qu'une fonctionnalité est incluse dans le plan.
 * Lève une `AppError` 402 sinon.
 */
export async function assertFeature(
  ctx: OrganizationContext,
  feature: keyof PlanFeatures,
): Promise<void> {
  const plan = await getUserPlan(ctx.userId);

  if (!plan.features[feature]) {
    throw new AppError(
      `Cette fonctionnalité n'est pas incluse dans le plan ${plan.name}.`,
      402,
      'FEATURE_NOT_INCLUDED',
    );
  }
}

/** Vue d'ensemble de la consommation, pour l'écran de facturation. */
export async function getQuotaSummary(ctx: OrganizationContext) {
  const plan = await getUserPlan(ctx.userId);

  const resources: QuotaResource[] = [
    'clients',
    'quotesPerMonth',
    'invoicesPerMonth',
    'products',
  ];

  const usage = await Promise.all(
    resources.map(async (resource) => ({
      resource,
      label: RESOURCE_LABELS[resource],
      used: await getUsage(ctx.organizationId, resource),
      limit: plan.limits[resource],
    })),
  );

  return { plan, usage };
}
