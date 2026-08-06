import { db } from '../db/server';
import { clients, contacts, deals, invoices, tasks } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { Client } from '../data/interfaces';
import { generateId } from '../utils/id-generator';
import { clientSchema } from '../validation/schemas';
import { AppError } from '@/lib/errors';
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

  /**
   * Supprime un client et toutes ses dépendances.
   *
   * Deux corrections :
   *  - l'ensemble est exécuté dans une TRANSACTION : l'ancienne version
   *    enchaînait quatre `DELETE` indépendants, et un échec en cours de route
   *    laissait la base incohérente (anomalie MS-020) ;
   *  - le retour ne s'appuie plus sur `result.changes`, qui n'existe pas dans
   *    le pilote PostgreSQL et renvoyait donc toujours `false` en production
   *    alors que la suppression avait réussi (anomalie MS-021).
   *
   * Les suppressions en cascade sont restreintes à l'organisation : sans cela,
   * un identifiant de client d'un autre locataire aurait supprimé ses données.
   */
  async deleteWithCascade(id: string, organizationId: string, userId: string): Promise<boolean> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('Accès non autorisé à cette organisation', 403, 'UNAUTHORIZED');
    }

    const existing = await this.findById(id, organizationId);
    if (!existing) return false;

    await db.transaction(async (tx) => {
      await tx
        .delete(contacts)
        .where(and(eq(contacts.clientId, id), eq(contacts.organizationId, organizationId)));
      await tx
        .delete(deals)
        .where(and(eq(deals.clientId, id), eq(deals.organizationId, organizationId)));
      await tx
        .delete(invoices)
        .where(and(eq(invoices.clientId, id), eq(invoices.organizationId, organizationId)));
      await tx
        .delete(tasks)
        .where(
          and(
            eq(tasks.entityType, 'client'),
            eq(tasks.entityId, id),
            eq(tasks.organizationId, organizationId),
          ),
        );
      await tx
        .delete(clients)
        .where(and(eq(clients.id, id), eq(clients.organizationId, organizationId)));
    });

    console.info('[audit] client.deleted', {
      clientId: id,
      organizationId,
      userId,
      at: new Date().toISOString(),
    });

    return true;
  },
};
