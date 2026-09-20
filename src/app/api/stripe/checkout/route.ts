import { NextResponse } from 'next/server';
import { createSubscriptionCheckout } from '@/lib/stripe/billing';
import { userService } from '@/lib/services/user.service';
import { isStripeConfigured } from '@/lib/stripe';
import { requireProfessional } from '@/lib/auth/session';
import { toErrorResponse } from '@/lib/utils/api-response';

const PRICE_BY_TIER: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS,
};

/**
 * Ouvre une session d'abonnement Stripe pour le professionnel connecté.
 *
 * L'abonnement MonSERVICE est strictement réservé aux professionnels / organisations.
 * Les métadonnées d'attribution de droits proviennent exclusivement de la session serveur.
 */
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 });
  }

  try {
    const ctx = await requireProfessional();

    const body = await req.json().catch(() => null);
    const tier = typeof body?.tier === 'string' ? body.tier : null;

    if (!tier || !(tier in PRICE_BY_TIER)) {
      return NextResponse.json({ error: 'Plan inconnu' }, { status: 400 });
    }

    const priceId = PRICE_BY_TIER[tier];
    if (!priceId) {
      return NextResponse.json({ error: 'Plan non configuré côté serveur' }, { status: 503 });
    }

    const user = await userService.getUserProfile(ctx.userId);
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const url = await createSubscriptionCheckout(
      user.stripeCustomerId ?? null,
      user.email ?? null,
      priceId,
      `${baseUrl}/parametres/facturation?session_id={CHECKOUT_SESSION_ID}`,
      `${baseUrl}/parametres/facturation`,
      // Les métadonnées proviennent de la session, jamais du client :
      // c'est sur elles que le webhook accorde les droits.
      { userId: ctx.userId, organizationId: ctx.organizationId, tier },
    );

    return NextResponse.json({ url });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors de la création de la session');
  }
}
