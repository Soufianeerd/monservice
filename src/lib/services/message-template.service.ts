import 'server-only';
import { db } from '../db/server';
import { messageTemplates } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { MessageTemplate } from '../data/interfaces';
import { generateId } from '../utils/id-generator';

export const messageTemplateService = {
  async findAll(organizationId: string): Promise<MessageTemplate[]> {
    return await db.select().from(messageTemplates).where(eq(messageTemplates.organizationId, organizationId)) as MessageTemplate[];
  },

  async getById(id: string, organizationId: string): Promise<MessageTemplate | null> {
    const result = await db.select().from(messageTemplates).where(and(eq(messageTemplates.id, id), eq(messageTemplates.organizationId, organizationId)));
    return result[0] as MessageTemplate || null;
  }
};
