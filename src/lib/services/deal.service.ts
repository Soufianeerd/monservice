import { db } from '../db/server';
import { deals } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { Deal } from '../data/interfaces';
import { generateId } from '../utils/id-generator';
import { dealSchema } from '../validation/schemas';
import { AppError } from '@/lib/errors';
import { userService } from './user.service';

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

  async create(data: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Deal> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== data.organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }

    const validated = dealSchema.parse(data);
    const id = generateId();
    const now = new Date().toISOString();
    const newDeal = {
      id,
      ...validated,
      expectedCloseDate: validated.expectedCloseDate || new Date().toISOString(),
      signature: data.signature ? JSON.stringify(data.signature) : null,
      description: data.description || null,
      signedAt: null,
      signatureToken: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(deals).values(newDeal);
    return this.findById(id, data.organizationId) as Promise<Deal>;
  },

  async update(id: string, organizationId: string, data: Partial<Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>>, userId: string): Promise<Deal | null> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }

    const partialSchema = dealSchema.partial();
    const validated = partialSchema.parse(data);

    const updated = {
      ...validated,
      signature: data.signature !== undefined ? (data.signature ? JSON.stringify(data.signature) : null) : undefined,
      description: data.description !== undefined ? data.description : undefined,
      updatedAt: new Date().toISOString(),
    };
    await db.update(deals)
      .set(updated)
      .where(and(eq(deals.id, id), eq(deals.organizationId, organizationId)));
    return await this.findById(id, organizationId);
  },

  async updateStatus(id: string, status: Deal['status'], organizationId: string, userId: string): Promise<Deal | null> {
    return this.update(id, organizationId, { status }, userId);
  },

  async delete(id: string, organizationId: string, userId: string): Promise<void> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }
    await db.delete(deals).where(and(eq(deals.id, id), eq(deals.organizationId, organizationId)));
  },
};
