import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { invoiceService } from '@/lib/services/invoice.service';
import { userService } from '@/lib/services/user.service';
import { stripeEventService } from '@/lib/services/stripe-event.service';

/**
 * Webhook Stripe — seul chemin autorisé pour accorder ou retirer des droits
 * payants, et pour passer une facture au statut « payée ».
 *
 * Corrections apportées :
 *  - idempotence : chaque `event.id` n'est traité qu'une fois (un rejeu
 *    d'événement ne duplique plus les effets) — MS-014 ;
 *  - `customer.subscription.deleted` et `.updated` sont désormais traités :
 *    les droits payants étaient auparavant conservés après une résiliation ;
 *  - `invoice.payment_failed` fait basculer l'abonnement en impayé.
 */

export async function POST(req: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe] webhook appelé mais Stripe non configuré');
    return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error('[stripe] signature de webhook invalide', err);
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  // Idempotence : Stripe rejoue les événements en cas de timeout ou d'erreur.
  const alreadyProcessed = await stripeEventService.markProcessedIfNew(event.id, event.type);
  if (alreadyProcessed) {
    console.info('[stripe] événement déjà traité, ignoré', { id: event.id, type: event.type });
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === 'subscription') {
          const userId = session.metadata?.userId;
          const tier = session.metadata?.tier;
          if (userId && tier) {
            await userService.updateSubscriptionFromStripeWebhook(userId, {
              subscriptionTier: tier,
              subscriptionStatus: 'active',
            });
            if (session.customer) {
              await userService.setStripeCustomerId(userId, session.customer as string);
            }
          } else {
            console.error('[stripe] métadonnées manquantes sur checkout.session.completed', {
              eventId: event.id,
            });
          }
        } else if (session.mode === 'payment') {
          const invoiceId = session.metadata?.invoiceId;
          if (invoiceId) {
            await invoiceService.markAsPaidFromStripeWebhook(
              invoiceId,
              session.payment_intent as string,
              session.amount_total ?? undefined,
            );
          } else {
            console.error('[stripe] invoiceId manquant sur checkout.session.completed', {
              eventId: event.id,
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          const active = ['active', 'trialing'].includes(subscription.status);
          await userService.updateSubscriptionFromStripeWebhook(userId, {
            subscriptionTier: subscription.metadata?.tier ?? 'free',
            subscriptionStatus: active ? 'active' : subscription.status,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // Sans ce cas, les droits payants restaient acquis indéfiniment
        // après une résiliation (fuite de revenu).
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          await userService.updateSubscriptionFromStripeWebhook(userId, {
            subscriptionTier: 'free',
            subscriptionStatus: 'cancelled',
          });
        } else {
          console.error('[stripe] userId manquant sur customer.subscription.deleted', {
            eventId: event.id,
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const stripeInvoice = event.data.object as Stripe.Invoice;
        const userId = stripeInvoice.metadata?.userId;
        if (userId) {
          await userService.updateSubscriptionFromStripeWebhook(userId, {
            subscriptionTier: 'free',
            subscriptionStatus: 'past_due',
          });
        }
        break;
      }

      default:
        console.info('[stripe] événement non traité', { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Le traitement a échoué : on libère l'idempotence pour que Stripe
    // puisse rejouer l'événement, et on renvoie 500 pour déclencher le retry.
    await stripeEventService.releaseOnFailure(event.id);
    console.error('[stripe] échec du traitement du webhook', { eventId: event.id, error });
    return NextResponse.json({ error: 'Traitement en échec' }, { status: 500 });
  }
}
