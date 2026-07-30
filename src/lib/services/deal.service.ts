import { db } from '@/lib/db';
import { deals } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@/lib/utils/id-generator';
import { Deal } from '@/lib/data/interfaces';

export const dealService = {
  async findAll(organizationId: string): Promise<Deal[]> {
    const results = await db.select().from(deals).where(eq(deals.organizationId, organizationId));
    return results.map(r => ({ ...r, status: r.status as any, description: r.description || undefined, signature: r.signature || undefined, signedAt: r.signedAt || undefined, signatureToken: r.signatureToken || undefined }));
  },

  async findByClientId(clientId: string, organizationId: string): Promise<Deal[]> {
    const results = await db.select().from(deals).where(
      and(eq(deals.clientId, clientId), eq(deals.organizationId, organizationId))
    );
    return results.map(r => ({ ...r, status: r.status as any, description: r.description || undefined, signature: r.signature || undefined, signedAt: r.signedAt || undefined, signatureToken: r.signatureToken || undefined }));
  },

  async findById(id: string, organizationId: string): Promise<Deal | null> {
    const result = await db.select().from(deals).where(
      and(eq(deals.id, id), eq(deals.organizationId, organizationId))
    );
    if (!result[0]) return null;
    return { ...result[0], status: result[0].status as any, description: result[0].description || undefined, signature: result[0].signature || undefined, signedAt: result[0].signedAt || undefined, signatureToken: result[0].signatureToken || undefined };
  },

  async create(data: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deal> {
    const now = new Date().toISOString();
    const newDeal = {
      id: generateId(),
      ...data,
      signature: data.signature ? JSON.stringify(data.signature) : null,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(deals).values(newDeal);
    return { ...newDeal, signature: data.signature };
  },

  async update(id: string, organizationId: string, data: Partial<Deal>): Promise<Deal | null> {
    const updated = {
      ...data,
      signature: data.signature !== undefined ? (data.signature ? JSON.stringify(data.signature) : null) : undefined,
      updatedAt: new Date().toISOString(),
    };
    await db.update(deals)
      .set(updated)
      .where(and(eq(deals.id, id), eq(deals.organizationId, organizationId)));
    return await this.findById(id, organizationId);
  },

  async delete(id: string, organizationId: string): Promise<void> {
    await db.delete(deals).where(and(eq(deals.id, id), eq(deals.organizationId, organizationId)));
  },
};
