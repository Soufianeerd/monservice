import 'server-only';
import { getStripe } from './index';
import Stripe from 'stripe';

export async function createSubscriptionCheckout(
  customerId: string | null,
  customerEmail: string | null,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata: { userId: string; organizationId: string; tier?: string },
): Promise<string> {
  // Stripe refuse `customer` et `customer_email` simultanément.
  // Sans identifiant client connu, on laisse Stripe créer le client à partir
  // de l'adresse e-mail (l'ancienne version passait une chaîne vide).
  const session = await getStripe().checkout.sessions.create({
    ...(customerId ? { customer: customerId } : {}),
    ...(!customerId && customerEmail ? { customer_email: customerEmail } : {}),
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    allow_promotion_codes: true,
  });
  return session.url!;
}

export async function getSubscription(customerId: string): Promise<Stripe.Subscription | null> {
  const subscriptions = await getStripe().subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });
  return subscriptions.data[0] || null;
}

export async function createCustomer(
  email: string,
  metadata: Record<string, string>,
): Promise<string> {
  const customer = await getStripe().customers.create({ email, metadata });
  return customer.id;
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url!;
}
