import { db } from '@/lib/db';
import { contacts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@/lib/utils/id-generator';
import { Contact } from '@/lib/data/interfaces';

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

  async create(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    const now = new Date().toISOString();
    const newContact = {
      id: generateId(),
      ...data,
      email: data.email || '',
      phone: data.phone || '',
      position: data.position || '',
      isPrimary: data.isPrimary ?? false,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(contacts).values(newContact);
    return newContact;
  },

  async update(id: string, organizationId: string, data: Partial<Contact>): Promise<Contact | null> {
    const updated: any = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    if (data.email === undefined) delete updated.email;
    if (data.phone === undefined) delete updated.phone;
    if (data.position === undefined) delete updated.position;

    await db.update(contacts)
      .set(updated)
      .where(and(eq(contacts.id, id), eq(contacts.organizationId, organizationId)));
    return await this.findById(id, organizationId);
  },

  async delete(id: string, organizationId: string): Promise<void> {
    await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.organizationId, organizationId)));
  },
};
