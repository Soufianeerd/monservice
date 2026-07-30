import { db } from '@/lib/db';
import { clients } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@/lib/utils/id-generator';
import { Client } from '@/lib/data/interfaces';

export const clientService = {
  async findAll(organizationId: string): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.organizationId, organizationId));
  },

  async findById(id: string, organizationId: string): Promise<Client | null> {
    const result = await db.select().from(clients).where(
      and(eq(clients.id, id), eq(clients.organizationId, organizationId))
    );
    return result[0] || null;
  },

  async create(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const now = new Date().toISOString();
    const newClient = {
      id: generateId(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(clients).values(newClient);
    return newClient;
  },

  async update(id: string, organizationId: string, data: Partial<Client>): Promise<Client | null> {
    const updated = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await db.update(clients)
      .set(updated)
      .where(and(eq(clients.id, id), eq(clients.organizationId, organizationId)));
    return await this.findById(id, organizationId);
  },

  async delete(id: string, organizationId: string): Promise<void> {
    await db.delete(clients).where(and(eq(clients.id, id), eq(clients.organizationId, organizationId)));
  },
};
