import { stripe } from '@/lib/stripe';
import { invoiceRepository } from '@/lib/data/repositories/invoice.repository';
import { userRepository } from '@/lib/data/repositories/user.repository';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!signature || !endpointSecret) {
      console.warn('Webhook secret or signature missing, using unverified payload');
      event = JSON.parse(payload);
    } else {
      event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    }
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Mode subscription (SaaS)
      if (session.mode === 'subscription') {
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier as 'starter' | 'pro' | 'business' | 'free';
        if (userId && tier) {
          try {
            await userRepository.updateSubscription(userId, tier, 'active', session.customer as string);
            console.log(`Abonnement ${tier} activé pour l'utilisateur ${userId}`);
          } catch (error) {
            console.error(`Erreur abonnement user ${userId}`, error);
          }
        }
      } 
      // Mode payment (Facture client)
      else if (session.mode === 'payment') {
        const invoiceId = session.metadata?.invoiceId;
        if (invoiceId) {
          try {
            await invoiceRepository.markAsPaid(invoiceId, session.payment_intent as string);
            console.log(`Facture ${invoiceId} marquée comme payée`);
          } catch (error) {
            console.error(`Erreur facture ${invoiceId}`, error);
          }
        }
      }
      break;
    }
    case 'customer.subscription.updated': {
      // Pour l'instant, on ignore les mises à jour mineures ou on peut synchroniser le statut
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      // on pourrait retrouver l'utilisateur par stripeCustomerId et le passer en 'free'
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
