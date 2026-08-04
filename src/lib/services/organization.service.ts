import 'server-only';
import { db } from '../db/server';
import { organizations } from '../db/schema';
import { eq } from 'drizzle-orm';
import { Organization } from '../data/interfaces';
import { generateId } from '../utils/id-generator';

import { AppError } from '../utils/error-handler';

export const organizationService = {
  async getById(id: string): Promise<Organization | null> {
    const result = await db.select().from(organizations).where(eq(organizations.id, id));
    return result[0] as Organization || null;
  },

  async create(data: Partial<Organization>): Promise<Organization> {
    const validated = data;
    const id = generateId();
    const now = new Date().toISOString();
    
    await db.insert(organizations).values({
      id,
      ...validated,
      createdAt: now,
      updatedAt: now,
    } as any);
    
    return this.getById(id) as Promise<Organization>;
  },

  async update(id: string, data: Partial<Organization>): Promise<Organization | null> {
    
    const validated = data;

    await db.update(organizations).set({
      ...validated,
      updatedAt: new Date().toISOString()
    }).where(eq(organizations.id, id));
    
    return this.getById(id);
  }
};
