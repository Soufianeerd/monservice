import { NextResponse } from 'next/server';
import { organizationService } from '@/lib/services/organization.service';
import { createConnectAccount, createAccountLink } from '@/lib/stripe/connect';
import { isStripeConfigured } from '@/lib/stripe';
import { requireProfessional } from '@/lib/auth/session';
import { toErrorResponse } from '@/lib/utils/api-response';

/**
 * Génère un lien d'onboarding Stripe Connect pour l'organisation de
 * l'utilisateur connecté.
 *
 * L'ancienne version acceptait un `organizationId` arbitraire dans le corps de
 * la requête, sans aucune authentification : n'importe qui pouvait obtenir un
 * lien d'onboarding — donc l'accès au flux de configuration bancaire — pour
 * l'organisation de son choix (anomalie MS-012).
 */
export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 });
  }

  try {
    const ctx = await requireProfessional();

    const organization = await organizationService.getById(ctx.organizationId);
    if (!organization) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 });
    }

    let accountId = organization.stripeAccountId;

    if (!accountId) {
      if (!organization.email) {
        return NextResponse.json(
          { error: "Renseignez l'adresse e-mail de l'organisation avant de connecter Stripe" },
          { status: 400 },
        );
      }

      accountId = await createConnectAccount(organization.email, ctx.organizationId);
      await organizationService.setStripeAccount(ctx.organizationId, accountId, 'pending');

      console.info('[audit] stripe.connect.account_created', {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        accountId,
        at: new Date().toISOString(),
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = await createAccountLink(
      accountId,
      `${baseUrl}/parametres/organisation?connect=success`,
      `${baseUrl}/parametres/organisation?connect=refresh`,
    );

    return NextResponse.json({ url });
  } catch (error) {
    return toErrorResponse(error, 'Erreur lors de la connexion au compte Stripe');
  }
}
