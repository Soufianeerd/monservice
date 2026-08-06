'use server';

import { requireSession } from '@/lib/auth/session';
import { db } from '@/lib/db/server';
import {
  users,
  organizations,
  clients,
  contacts,
  deals,
  products,
  invoices,
  invoiceLines,
  tasks,
  messages,
  requests,
} from '@/lib/db/schema';
import { eq, or, inArray } from 'drizzle-orm';
import { createClient } from '@/utils/supabase/server';

/**
 * Droits RGPD exerçables techniquement.
 *
 * Aucun de ces droits n'était implémenté : un utilisateur ne pouvait ni
 * récupérer ses données, ni supprimer son compte (anomalie MS-030). Les
 * articles 15 (accès), 17 (effacement) et 20 (portabilité) du RGPD imposent
 * de pouvoir répondre à ces demandes.
 *
 * Arbitrage de conservation appliqué à la suppression : les documents
 * comptables (factures émises) ne sont PAS supprimés mais **anonymisés**.
 * L'article 17.3.b prévoit que le droit à l'effacement ne s'applique pas
 * lorsqu'un traitement est nécessaire au respect d'une obligation légale —
 * en France, la conservation des pièces comptables pendant 10 ans
 * (art. L123-22 du Code de commerce).
 */

/**
 * Export complet des données de l'utilisateur, au format JSON.
 * Article 15 (droit d'accès) et article 20 (portabilité).
 */
export async function exportMyDataAction(): Promise<{
  filename: string;
  contentType: string;
  data: string;
}> {
  const ctx = await requireSession();

  const [profile] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      profileType: users.profileType,
      organizationId: users.organizationId,
      subscriptionTier: users.subscriptionTier,
      subscriptionStatus: users.subscriptionStatus,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, ctx.userId));

  const payload: Record<string, unknown> = {
    _meta: {
      genereLe: new Date().toISOString(),
      format: 'JSON',
      base: 'RGPD art. 15 et 20',
      note:
        "Cet export contient les données personnelles vous concernant ainsi que " +
        "les données professionnelles de votre organisation.",
    },
    profil: profile ?? null,
    messages: await db
      .select()
      .from(messages)
      .where(or(eq(messages.senderId, ctx.userId), eq(messages.receiverId, ctx.userId))),
    demandes: await db.select().from(requests).where(eq(requests.clientId, ctx.userId)),
  };

  // Données de l'organisation : uniquement pour un compte professionnel.
  if (ctx.organizationId) {
    const orgId = ctx.organizationId;

    const orgInvoices = await db.select().from(invoices).where(eq(invoices.organizationId, orgId));
    const invoiceIds = orgInvoices.map((i) => i.id);

    payload.organisation = {
      profil: (await db.select().from(organizations).where(eq(organizations.id, orgId)))[0] ?? null,
      clients: await db.select().from(clients).where(eq(clients.organizationId, orgId)),
      contacts: await db.select().from(contacts).where(eq(contacts.organizationId, orgId)),
      opportunites: await db.select().from(deals).where(eq(deals.organizationId, orgId)),
      produits: await db.select().from(products).where(eq(products.organizationId, orgId)),
      documents: orgInvoices,
      lignesDocuments: invoiceIds.length
        ? await db.select().from(invoiceLines).where(inArray(invoiceLines.invoiceId, invoiceIds))
        : [],
      taches: await db.select().from(tasks).where(eq(tasks.organizationId, orgId)),
    };
  }

  console.info('[audit] gdpr.export', { userId: ctx.userId, at: new Date().toISOString() });

  const date = new Date().toISOString().slice(0, 10);
  return {
    filename: `monservice-donnees-${date}.json`,
    contentType: 'application/json',
    data: JSON.stringify(payload, null, 2),
  };
}

/**
 * Aperçu de ce qui sera supprimé ou conservé.
 * À afficher avant confirmation : une suppression de compte est irréversible.
 */
export async function getAccountDeletionPreviewAction() {
  const ctx = await requireSession();

  const count = async (rows: Promise<unknown[]>) => (await rows).length;

  const preview = {
    supprime: {
      profil: 1,
      messages: await count(
        db
          .select({ id: messages.id })
          .from(messages)
          .where(or(eq(messages.senderId, ctx.userId), eq(messages.receiverId, ctx.userId))),
      ),
      demandes: await count(
        db.select({ id: requests.id }).from(requests).where(eq(requests.clientId, ctx.userId)),
      ),
    },
    conserveAnonymise: {
      documentsComptables: ctx.organizationId
        ? await count(
            db
              .select({ id: invoices.id })
              .from(invoices)
              .where(eq(invoices.organizationId, ctx.organizationId)),
          )
        : 0,
      motif: 'Obligation légale de conservation — 10 ans (art. L123-22 Code de commerce)',
    },
  };

  return preview;
}

/**
 * Suppression du compte — article 17 (droit à l'effacement).
 *
 * ⚠️ IRRÉVERSIBLE. La confirmation par saisie de l'adresse e-mail est exigée
 * côté serveur, pas seulement dans l'interface.
 */
export async function deleteMyAccountAction(confirmationEmail: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const ctx = await requireSession();

  if (!ctx.email || confirmationEmail.trim().toLowerCase() !== ctx.email.toLowerCase()) {
    return { success: false, error: "L'adresse e-mail saisie ne correspond pas au compte." };
  }

  try {
    await db.transaction(async (tx) => {
      // 1. Données personnelles supprimées sans conservation.
      await tx
        .delete(messages)
        .where(or(eq(messages.senderId, ctx.userId), eq(messages.receiverId, ctx.userId)));
      await tx.delete(requests).where(eq(requests.clientId, ctx.userId));

      // 2. Organisation : anonymisation des documents comptables, suppression
      //    du reste. Les factures sont conservées, mais détachées de toute
      //    donnée nominative.
      if (ctx.organizationId) {
        const orgId = ctx.organizationId;

        await tx
          .update(invoices)
          .set({
            signature: null,
            signatureIp: null,
            message: null,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(invoices.organizationId, orgId));

        await tx.delete(contacts).where(eq(contacts.organizationId, orgId));
        await tx.delete(deals).where(eq(deals.organizationId, orgId));
        await tx.delete(tasks).where(eq(tasks.organizationId, orgId));
        await tx.delete(products).where(eq(products.organizationId, orgId));
        await tx.delete(clients).where(eq(clients.organizationId, orgId));

        await tx
          .update(organizations)
          .set({
            name: 'Organisation supprimée',
            email: null,
            phone: null,
            address: null,
            city: null,
            postalCode: null,
            description: null,
            logo: null,
            bankDetails: null,
            slug: null,
            isPublic: false,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(organizations.id, orgId));
      }

      // 3. Profil applicatif.
      await tx.delete(users).where(eq(users.id, ctx.userId));
    });

    console.info('[audit] gdpr.account_deleted', {
      userId: ctx.userId,
      at: new Date().toISOString(),
    });

    // 4. Fermeture de la session. Le compte `auth.users` est supprimé en
    //    cascade par la contrainte `users_auth_fk`… dans l'autre sens
    //    uniquement : la suppression effective côté Supabase Auth exige la clé
    //    `service_role` et doit être traitée par une tâche serveur dédiée.
    //    En attendant, le compte ne peut plus se connecter faute de profil.
    const supabase = await createClient();
    await supabase.auth.signOut();

    return { success: true };
  } catch (error) {
    console.error('[gdpr] échec de la suppression de compte', { userId: ctx.userId, error });
    return { success: false, error: 'La suppression a échoué. Contactez le support.' };
  }
}
