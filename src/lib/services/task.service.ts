import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@/lib/utils/id-generator';
import { Task } from '@/lib/data/interfaces';

export const taskService = {
  async findAll(organizationId: string): Promise<Task[]> {
    const results = await db.select().from(tasks).where(eq(tasks.organizationId, organizationId));
    return results.map(r => ({ ...r, status: r.status as any, priority: r.priority as any, entityType: r.entityType as any, entityId: r.entityId || undefined, assignedTo: r.assignedTo || undefined, description: r.description || '', dueDate: r.dueDate || '' }));
  },

  async findByOrganization(organizationId: string): Promise<Task[]> {
    return this.findAll(organizationId);
  },

  async findById(id: string, organizationId: string): Promise<Task | null> {
    const result = await db.select().from(tasks).where(
      and(eq(tasks.id, id), eq(tasks.organizationId, organizationId))
    );
    if (!result[0]) return null;
    return { ...result[0], status: result[0].status as any, priority: result[0].priority as any, entityType: result[0].entityType as any, entityId: result[0].entityId || undefined, assignedTo: result[0].assignedTo || undefined, description: result[0].description || '', dueDate: result[0].dueDate || '' };
  },

  async findByEntity(entityType: string, entityId: string, organizationId: string): Promise<Task[]> {
    const results = await db.select().from(tasks).where(
      and(eq(tasks.entityType, entityType), eq(tasks.entityId, entityId), eq(tasks.organizationId, organizationId))
    );
    return results.map(r => ({ ...r, status: r.status as any, priority: r.priority as any, entityType: r.entityType as any, entityId: r.entityId || undefined, assignedTo: r.assignedTo || undefined, description: r.description || '', dueDate: r.dueDate || '' }));
  },

  async create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const now = new Date().toISOString();
    const newTask = {
      id: generateId(),
      ...data,
      entityId: data.entityId || null,
      assignedTo: data.assignedTo || null,
      description: data.description || null,
      entityType: data.entityType || null,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(tasks).values(newTask);
    return this.findById(newTask.id, data.organizationId) as Promise<Task>;
  },

  async update(id: string, organizationId: string, data: Partial<Task>): Promise<Task | null> {
    const updated = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    if (data.entityId === undefined) delete updated.entityId;
    if (data.assignedTo === undefined) delete updated.assignedTo;
    if (data.description === undefined) delete updated.description;
    if (data.entityType === undefined) delete updated.entityType;

    await db.update(tasks)
      .set(updated as any)
      .where(and(eq(tasks.id, id), eq(tasks.organizationId, organizationId)));
    return await this.findById(id, organizationId);
  },

  async delete(id: string, organizationId: string): Promise<void> {
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.organizationId, organizationId)));
  },
};
