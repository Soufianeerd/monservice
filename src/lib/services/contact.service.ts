import { contactUpdateSchema } from '@/lib/validation/core-update.schemas';
import { requireCoreUpdateActor, requireCoreRelation } from './core-update-authorization';
import { db } from '../db/server';
import { contacts } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '../utils/id-generator';
import { Contact } from '../data/interfaces';
import { contactSchema } from '../validation/schemas';
import { AppError } from '@/lib/errors';
import { userService } from './user.service';

export const contactService = {
  async findAll(organizationId: string): Promise<Contact[]> {
    return await db.select().from(contacts).where(eq(contacts.organizationId, organizationId));
  },

  async findByClientId(clientId: string, organizationId: string): Promise<Contact[]> {
    return await db.select().from(contacts).where(
      and(eq(contacts.clientId, clientId), eq(contacts.organizationId, organizationId))
    );
  },

  async findById(id: string, organizationId: string): Promise<Contact | null> {
    const result = await db.select().from(contacts).where(
      and(eq(contacts.id, id), eq(contacts.organizationId, organizationId))
    );
    return result[0] || null;
  },

  async create(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Contact> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== data.organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }

    const validated = contactSchema.parse({
      ...data,
      role: data.position, // Assuming position and role are mapping to the same thing
    });

    const now = new Date().toISOString();
    const newContact = {
      id: generateId(),
      ...validated,
      email: validated.email || '',
      phone: validated.phone || '',
      position: validated.role || '',
      isPrimary: validated.isPrimary ?? false,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(contacts).values(newContact);
    return newContact;
  },

  async update(id: string, organizationId: string, data: Partial<Contact>, userId: string): Promise<Contact | null> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }

    const validated = contactUpdateSchema.parse(data);
    await db.transaction(async (tx) => {
      await requireCoreUpdateActor(tx, organizationId, userId);
      const [existing] = await tx.select().from(contacts).where(and(eq(contacts.id,id),eq(contacts.organizationId,organizationId))).limit(1).for('update');
      if (!existing) return null;
      if (validated.clientId) await requireCoreRelation(tx,organizationId,'client',validated.clientId);
      await tx.update(contacts).set({ ...validated, updatedAt: new Date().toISOString() }).where(and(eq(contacts.id,id),eq(contacts.organizationId,organizationId)));
    });
    return this.findById(id, organizationId);
  },

  async delete(id: string, organizationId: string, userId: string): Promise<void> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }
    await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.organizationId, organizationId)));
  },
};
