import 'server-only';
import { db } from '@/lib/db/server';
import { clients, contacts, deals, invoices, products, users } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
export type CoreUpdateTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function requireCoreUpdateActor(tx: CoreUpdateTx, organizationId: string, userId: string) {
  const [actor] = await tx.select({ id: users.id }).from(users).where(and(
    eq(users.id,userId),eq(users.organizationId,organizationId),eq(users.profileType,'professional'),isNull(users.accountClosedAt),
  )).limit(1).for('share');
  if (!actor) throw new AppError('Accès professionnel refusé',403,'FORBIDDEN');
}
export async function requireCoreRelation(tx: CoreUpdateTx, organizationId: string, kind: string, id: string) {
  const table = kind === 'client' ? clients : kind === 'contact' ? contacts : kind === 'deal' ? deals
    : kind === 'invoice' || kind === 'quote' ? invoices : kind === 'product' ? products : kind === 'user' ? users : null;
  if (!table) throw new AppError('Relation inconnue',400,'INVALID_RELATION');
  const conditions = [eq(table.id,id),eq(table.organizationId,organizationId)];
  if (kind === 'quote' || kind === 'invoice') conditions.push(eq(invoices.type,kind));
  if (kind === 'user') conditions.push(eq(users.profileType,'professional'));
  const [row] = await tx.select({ id:table.id }).from(table).where(and(...conditions)).limit(1).for('share');
  if (!row) throw new AppError('Relation hors organisation ou introuvable',403,'INVALID_RELATION');
}
