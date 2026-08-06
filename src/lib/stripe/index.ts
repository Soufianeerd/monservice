import 'server-only';
import Stripe from 'stripe';

/**
 * Client Stripe — initialisation paresseuse.
 *
 * L'ancienne version instanciait `new Stripe(process.env.STRIPE_SECRET_KEY || '')`
 * au chargement du module. Le SDK lève une exception sur une clé vide, ce qui
 * faisait échouer le build Netlify dès la collecte des pages, avant même que
 * la garde `if (!process.env.STRIPE_SECRET_KEY)` du handler ne s'exécute
 * (anomalie MS-010).
 *
 * Le repli `'sk_test_mock'` a également été retiré : il masquait une clé
 * manquante en production au lieu de la signaler.
 */

/** Version d'API unique pour toute l'application. */
export const STRIPE_API_VERSION = '2025-01-27.acacia' as Stripe.LatestApiVersion;

let cachedClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error(
      "STRIPE_SECRET_KEY n'est pas définie. Les fonctionnalités de paiement sont indisponibles.",
    );
  }

  cachedClient = new Stripe(apiKey, { apiVersion: STRIPE_API_VERSION });
  return cachedClient;
}

/** Indique si Stripe est configuré, sans lever d'exception. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
