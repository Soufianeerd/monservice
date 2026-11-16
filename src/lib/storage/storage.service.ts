import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { invoices } from '@/lib/db/schema';
import { requireSession, requireProfessional } from '@/lib/auth/session';
import { requireClientBillingAuthority } from '@/lib/billing/authorization';
import { AppError } from '@/lib/errors';
import { objectStore } from './neon-object-store';

async function authorizePath(storagePath: string) {
  const actor = await requireSession();
  const [document] = await db.select().from(invoices).where(eq(invoices.structuredInvoicePath, storagePath)).limit(1);
  if (!document) throw new AppError('Document introuvable', 404);
  if (actor.profileType === 'client') await requireClientBillingAuthority(document, actor.userId);
  else if (actor.profileType !== 'professional' || actor.organizationId !== document.organizationId) throw new AppError('Accès refusé', 403);
  if (!storagePath.startsWith(`${document.organizationId}/${document.id}/`)) throw new AppError('Clé de stockage invalide', 403);
}

export const storageService = {
  async save(fileName: string, content: string | Buffer, resource: { organizationId: string; documentId: string }): Promise<string> {
    const actor = await requireProfessional();
    if (resource.organizationId !== actor.organizationId) throw new AppError('Accès refusé', 403);
    const [document] = await db.select({ id: invoices.id }).from(invoices).where(and(eq(invoices.id, resource.documentId), eq(invoices.organizationId, actor.organizationId)));
    if (!document) throw new AppError('Document introuvable', 404);
    const suffix = fileName.endsWith('.xml') ? 'xml' : fileName.endsWith('.zip') ? 'zip' : 'pdf';
    const key = `${actor.organizationId}/${document.id}/${randomUUID()}.${suffix}`;
    const bytes = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
    await objectStore.put('einvoices', key, bytes, suffix === 'xml' ? 'application/xml' : suffix === 'zip' ? 'application/zip' : 'application/pdf');
    return key;
  },
  async getDownloadUrl(storagePath: string): Promise<string> {
    await authorizePath(storagePath);
    return objectStore.presign('einvoices', storagePath);
  },
  async getFileBuffer(storagePath: string): Promise<Buffer> {
    await authorizePath(storagePath);
    return objectStore.read('einvoices', storagePath);
  },
};
