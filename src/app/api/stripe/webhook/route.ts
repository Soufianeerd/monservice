import { stripe } from '@/lib/stripe';
import { invoiceRepository } from '@/lib/data/repositories/invoice.repository';
import { NextResponse } from 'next/server';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;

  try {
    if (!signature || !endpointSecret) {
      // In development/testing without proper secret, just parse the JSON
      console.warn('Webhook secret or signature missing, using unverified payload');
      event = JSON.parse(payload);
    } else {
      event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    }
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      
      const invoiceId = session.metadata?.invoiceId;
      
      if (invoiceId) {
        try {
          await invoiceRepository.updatePaymentStatus(invoiceId, 'paid');
          console.log(`Facture ${invoiceId} marquée comme payée suite au webhook Stripe`);
        } catch (error) {
          console.error(`Erreur lors de la mise à jour de la facture ${invoiceId}`, error);
        }
      }
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
