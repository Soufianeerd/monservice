/**
 * Définition des plans tarifaires — source de vérité unique.
 *
 * Avant cette implémentation, les limites annoncées sur la page de tarifs
 * (« 50 clients », « 10 devis/mois ») n'étaient appliquées nulle part : un
 * compte gratuit disposait exactement des mêmes droits qu'un compte Business
 * (anomalie MS-019). C'est une fuite de revenu directe.
 *
 * Ce fichier doit rester le SEUL endroit où les limites sont définies. La
 * page de tarifs et les contrôles serveur le consomment tous les deux, ce qui
 * garantit qu'aucune promesse commerciale ne peut diverger du comportement
 * réel du produit.
 */

export type PlanId = 'free' | 'starter' | 'pro' | 'business';

/** `null` = illimité. */
export type PlanLimits = {
  clients: number | null;
  /** Devis créés par mois calendaire. */
  quotesPerMonth: number | null;
  /** Factures créées par mois calendaire. */
  invoicesPerMonth: number | null;
  products: number | null;
  teamMembers: number | null;
};

export type PlanFeatures = {
  marketplace: boolean;
  electronicSignature: boolean;
  onlinePayment: boolean;
  advancedReports: boolean;
  messageTemplates: boolean;
  automaticReminders: boolean;
};

export type Plan = {
  id: PlanId;
  name: string;
  /** Prix mensuel en euros TTC. */
  price: number;
  description: string;
  limits: PlanLimits;
  features: PlanFeatures;
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Gratuit',
    price: 0,
    description: 'Pour tester le produit',
    limits: {
      clients: 50,
      quotesPerMonth: 10,
      invoicesPerMonth: 10,
      products: 20,
      teamMembers: 1,
    },
    features: {
      marketplace: true,
      electronicSignature: false,
      onlinePayment: false,
      advancedReports: false,
      messageTemplates: false,
      automaticReminders: false,
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 29,
    description: 'Pour les indépendants',
    limits: {
      clients: 500,
      quotesPerMonth: 100,
      invoicesPerMonth: 100,
      products: 200,
      teamMembers: 1,
    },
    features: {
      marketplace: true,
      electronicSignature: true,
      onlinePayment: true,
      advancedReports: false,
      messageTemplates: true,
      automaticReminders: true,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 79,
    description: 'Pour les petites équipes',
    limits: {
      clients: null,
      quotesPerMonth: null,
      invoicesPerMonth: null,
      products: null,
      teamMembers: 5,
    },
    features: {
      marketplace: true,
      electronicSignature: true,
      onlinePayment: true,
      advancedReports: true,
      messageTemplates: true,
      automaticReminders: true,
    },
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 149,
    description: 'Pour les structures établies',
    limits: {
      clients: null,
      quotesPerMonth: null,
      invoicesPerMonth: null,
      products: null,
      teamMembers: null,
    },
    features: {
      marketplace: true,
      electronicSignature: true,
      onlinePayment: true,
      advancedReports: true,
      messageTemplates: true,
      automaticReminders: true,
    },
  },
};

export const PLAN_ORDER: PlanId[] = ['free', 'starter', 'pro', 'business'];

export function getPlan(tier: string | null | undefined): Plan {
  if (tier && tier in PLANS) return PLANS[tier as PlanId];
  return PLANS.free;
}

/**
 * Plan effectif d'un utilisateur.
 *
 * Un abonnement dont le statut n'est ni `active` ni `trialing` retombe sur le
 * plan gratuit : c'est le pendant applicatif du traitement de
 * `customer.subscription.deleted` dans le webhook (anomalie MS-014).
 */
export function getEffectivePlan(
  subscriptionTier: string | null | undefined,
  subscriptionStatus: string | null | undefined,
): Plan {
  const statusGrantsAccess = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  if (!statusGrantsAccess) return PLANS.free;
  return getPlan(subscriptionTier);
}

export function isUpgrade(from: PlanId, to: PlanId): boolean {
  return PLAN_ORDER.indexOf(to) > PLAN_ORDER.indexOf(from);
}
