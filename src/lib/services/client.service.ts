import { db } from '../db';
import { clients, contacts, deals, invoices, tasks } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { Client } from '../data/interfaces';
import { generateId } from '../utils/id-generator';
import { clientSchema } from '../validation/schemas';
import { AppError } from '../utils/error-handler';
import { userService } from './user.service';

export const clientService = {
  async findAll(organizationId: string): Promise<Client[]> {
    const results = await db.select().from(clients).where(eq(clients.organizationId, organizationId));
    return results;
  },

  async findById(id: string, organizationId: string): Promise<Client | null> {
    const result = await db.select().from(clients).where(and(eq(clients.id, id), eq(clients.organizationId, organizationId)));
    if (!result[0]) return null;
    return result[0];
  },

  async create(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Client> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== data.organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }

    const validated = clientSchema.parse(data);
    const id = generateId();
    const now = new Date().toISOString();
    
    await db.insert(clients).values({
      id,
      ...validated,
      createdAt: now,
      updatedAt: now,
    });
    
    return this.findById(id, data.organizationId) as Promise<Client>;
  },

  async update(id: string, organizationId: string, data: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>, userId: string): Promise<Client | null> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }

    // Partial validation
    const partialSchema = clientSchema.partial();
    const validated = partialSchema.parse(data);

    await db.update(clients).set({
      ...validated,
      updatedAt: new Date().toISOString()
    }).where(and(eq(clients.id, id), eq(clients.organizationId, organizationId)));
    
    return this.findById(id, organizationId);
  },

  async deleteWithCascade(id: string, organizationId: string, userId: string): Promise<boolean> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }

    // Cascading deletes
    await db.delete(contacts).where(eq(contacts.clientId, id));
    await db.delete(deals).where(eq(deals.clientId, id));
    await db.delete(invoices).where(eq(invoices.clientId, id));
    // Tasks entityId/entityType is used. Delete tasks where entityType='client' and entityId=id
    await db.delete(tasks).where(and(eq(tasks.entityType, 'client'), eq(tasks.entityId, id)));

    const result = await db.delete(clients).where(and(eq(clients.id, id), eq(clients.organizationId, organizationId)));
    return result.changes > 0;
  }
};
