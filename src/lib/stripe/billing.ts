import { stripe } from './index';
import Stripe from 'stripe';

export async function createSubscriptionCheckout(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata: { userId: string; organizationId: string; tier?: string }
): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
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
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });
  return subscriptions.data[0] || null;
}

export async function createCustomer(email: string, metadata: Record<string, string>): Promise<string> {
  const customer = await stripe.customers.create({ email, metadata });
  return customer.id;
}

export async function createBillingPortalSession(customerId: string, returnUrl: string): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url!;
}
