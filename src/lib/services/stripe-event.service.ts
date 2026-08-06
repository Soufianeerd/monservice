import 'server-only';
import { db } from '../db/server';
import { stripeEvents } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Registre des événements Stripe déjà traités.
 *
 * Stripe garantit une livraison « au moins une fois » : un même événement peut
 * être reçu plusieurs fois (timeout, erreur, rejeu manuel). Sans registre,
 * un paiement pouvait être comptabilisé deux fois (anomalie MS-014).
 */
export const stripeEventService = {
  /**
   * Enregistre l'événement s'il est nouveau.
   * @returns `true` si l'événement avait DÉJÀ été traité (à ignorer).
   */
  async markProcessedIfNew(eventId: string, eventType: string): Promise<boolean> {
    const existing = await db
      .select({ id: stripeEvents.id })
      .from(stripeEvents)
      .where(eq(stripeEvents.id, eventId));

    if (existing.length > 0) return true;

    try {
      await db.insert(stripeEvents).values({
        id: eventId,
        type: eventType,
        processedAt: new Date().toISOString(),
      });
      return false;
    } catch {
      // Insertion concurrente : un autre worker a déjà pris l'événement.
      return true;
    }
  },

  /** Retire l'événement du registre pour permettre un rejeu après échec. */
  async releaseOnFailure(eventId: string): Promise<void> {
    try {
      await db.delete(stripeEvents).where(eq(stripeEvents.id, eventId));
    } catch (err) {
      console.error("[stripe] impossible de libérer l'événement pour rejeu", err);
    }
  },
};
