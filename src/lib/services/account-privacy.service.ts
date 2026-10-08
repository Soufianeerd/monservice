import 'server-only';
import { db } from '@/lib/db/server';
import { users, userRoles, organizations, clients, contacts, deals, products, invoices, invoiceLines, tasks, messages, requests } from '@/lib/db/schema';
import { and, eq, or, inArray, isNull } from 'drizzle-orm';
import type { SessionContext } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import { RBACService } from './rbac.service';
import { invoiceService } from './invoice.service';
import { toClientBillingDTO } from '@/lib/data/dto/client-billing.dto';
import { requireClientBillingAuthority } from '@/lib/billing/authorization';

/** Contexts are derived from requireSession by the server actions. */
export const accountPrivacyService = {
  async exportPersonal(ctx: SessionContext) {
    const [profile] = await db.select({
      id: users.id, email: users.email, name: users.name, profileType: users.profileType,
      organizationId: users.organizationId, createdAt: users.createdAt, updatedAt: users.updatedAt,
    }).from(users).where(and(eq(users.id,ctx.userId),isNull(users.accountClosedAt)));
    if (!profile) throw new AppError('Compte indisponible',401);
    const documents = profile.profileType === 'client' ? await invoiceService.findByClient(ctx.userId) : [];
    for (const document of documents) await requireClientBillingAuthority(document,ctx.userId);
    return {
      _meta: { genereLe:new Date().toISOString(),scope:'personal',note:'Export du profil, des échanges, demandes et documents clients liés au sujet. Les données conservées et les données cliniques peuvent nécessiter une demande dédiée.' },
      profil:profile,
      messages:await db.select().from(messages).where(or(eq(messages.senderId,ctx.userId),eq(messages.receiverId,ctx.userId))),
      demandes:await db.select().from(requests).where(eq(requests.clientId,ctx.userId)),
      documents:documents.map(toClientBillingDTO),
    };
  },
  async exportOrganization(ctx: SessionContext) {
    // Read membership from the database rather than trusting a supplied tenant.
    const [actor] = await db.select().from(users).where(and(eq(users.id,ctx.userId),isNull(users.accountClosedAt)));
    if (actor?.profileType !== 'professional' || !actor.organizationId) throw new AppError('Accès organisation refusé',403);
    const orgId=actor.organizationId;
    await new RBACService().require(ctx.userId,orgId,'privacy:export');
    const documents=await db.select().from(invoices).where(eq(invoices.organizationId,orgId));
    const ids=documents.map(d=>d.id);
    return {
      _meta:{ genereLe:new Date().toISOString(),scope:'organization',permission:'privacy:export' },
      organisation:{
        profil:(await db.select().from(organizations).where(eq(organizations.id,orgId)))[0] ?? null,
        clients:await db.select().from(clients).where(eq(clients.organizationId,orgId)),
        contacts:await db.select().from(contacts).where(eq(contacts.organizationId,orgId)),
        opportunites:await db.select().from(deals).where(eq(deals.organizationId,orgId)),
        produits:await db.select().from(products).where(eq(products.organizationId,orgId)),
        documents,
        lignesDocuments:ids.length ? await db.select().from(invoiceLines).where(and(eq(invoiceLines.organizationId,orgId),inArray(invoiceLines.invoiceId,ids))) : [],
        taches:await db.select().from(tasks).where(eq(tasks.organizationId,orgId)),
      },
    };
  },
  async closePersonalAccount(ctx: SessionContext, confirmationEmail: string) {
    return db.transaction(async tx => {
      const [subject]=await tx.select().from(users).where(eq(users.id,ctx.userId)).limit(1).for('update');
      if (!subject || subject.accountClosedAt) throw new AppError('Compte indisponible',401);
      if (!ctx.email || confirmationEmail.trim().toLowerCase() !== ctx.email.toLowerCase()) throw new AppError('Adresse de confirmation incorrecte',400);
      // Preserve IDs/tenant/profile and every organization-owned or retained record.
      await tx.update(users).set({
        accountClosedAt:new Date(),name:'Compte fermé',email:`closed-${subject.id}@account.invalid`,password:null,updatedAt:new Date().toISOString(),
      }).where(eq(users.id,ctx.userId));
      await tx.delete(userRoles).where(eq(userRoles.userId,ctx.userId));
      return { success:true };
    });
  },
};
