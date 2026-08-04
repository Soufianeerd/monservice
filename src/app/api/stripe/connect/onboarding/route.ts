import { organizationService } from '@/lib/services/organization.service';
import { createConnectAccount, createAccountLink } from '@/lib/stripe/connect';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { organizationId } = await req.json();

    const organization = await organizationService.getById(organizationId);
    if (!organization) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 });
    }

    let accountId = organization.stripeAccountId;
    
    if (!accountId) {
      accountId = await createConnectAccount(organization.email || 'contact@example.com', organizationId);
      await organizationService.update(organizationId, { stripeAccountId: accountId, stripeAccountStatus: 'pending' });
    }

    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/organization?connect=success`;
    const refreshUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/organization?connect=refresh`;

    const url = await createAccountLink(accountId, returnUrl, refreshUrl);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Erreur Stripe Connect:', error);
    return NextResponse.json({ error: 'Erreur lors de la connexion au compte' }, { status: 500 });
  }
}
