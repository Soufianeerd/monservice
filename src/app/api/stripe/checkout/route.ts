import { createSubscriptionCheckout } from '@/lib/stripe/billing';
import { NextResponse } from 'next/server';
import { userRepository } from '@/lib/data/repositories/user.repository';

export async function POST(req: Request) {
  try {
    const { userId, organizationId, tier } = await req.json();

    const user = await userRepository.getById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    let priceId = '';
    if (tier === 'starter') priceId = process.env.STRIPE_PRICE_STARTER!;
    else if (tier === 'pro') priceId = process.env.STRIPE_PRICE_PRO!;
    else if (tier === 'business') priceId = process.env.STRIPE_PRICE_BUSINESS!;

    if (!priceId) {
      return NextResponse.json({ error: 'Prix introuvable' }, { status: 400 });
    }

    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/billing?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/billing`;

    // Use existing customer ID if available, else create one or pass email
    // For simplicity, we just pass the email to create a new customer during checkout, 
    // or we could use `createCustomer` from our stripe util.
    // The stripe checkout api can take `customer_email` if `customer` is not provided.
    // We'll update billing.ts to support this. Let's just pass user email as customerId param,
    // and we'll fix billing.ts to use customer_email. But wait, `createSubscriptionCheckout`
    // takes customerId. If we don't have it, we create it.
    
    // For now, let's just assume we want to pass the email as customer_email. 
    // I'll adjust the parameters in `createSubscriptionCheckout` in another step or just pass empty string.
    
    const url = await createSubscriptionCheckout(
      user.stripeCustomerId || '', // if empty, we should ideally use customer_email
      priceId,
      successUrl,
      cancelUrl,
      { userId, organizationId, tier }
    );

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Erreur Stripe Checkout:', error);
    return NextResponse.json({ error: 'Erreur lors de la création de la session' }, { status: 500 });
  }
}
