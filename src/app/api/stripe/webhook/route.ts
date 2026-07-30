import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { invoiceService } from '@/lib/services/invoice.service';
import { userService } from '@/lib/services/user.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('PaymentIntent was successful!');
      break;
    
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Mode subscription (SaaS)
      if (session.mode === 'subscription') {
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier as 'starter' | 'pro' | 'business' | 'free';
        if (userId && tier) {
          try {
            await userService.updateUserProfile(userId, { 
              subscriptionTier: tier, 
              subscriptionStatus: 'active', 
              stripeCustomerId: session.customer as string 
            });
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
            await invoiceService.markAsPaid(invoiceId, session.payment_intent as string);
            console.log(`Facture ${invoiceId} marquée comme payée`);
          } catch (error) {
            console.error(`Erreur facture ${invoiceId}`, error);
          }
        }
      }
      break;
    }
    case 'customer.subscription.updated': {
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
