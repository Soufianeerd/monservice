import { stripe } from './index';

export async function createConnectAccount(email: string, organizationId: string): Promise<string> {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'FR',
    email,
    metadata: { organizationId },
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: true },
    },
  });
  return account.id;
}

export async function createAccountLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string> {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
  return link.url!;
}
