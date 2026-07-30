import { db } from '../db';
import { tasks } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '../utils/id-generator';
import { Task } from '../data/interfaces';
import { taskSchema } from '../validation/schemas';
import { AppError } from '../utils/error-handler';
import { userService } from './user.service';

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

  async create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Task> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== data.organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }

    const validated = taskSchema.parse(data);
    const now = new Date().toISOString();
    const newTask = {
      id: generateId(),
      ...validated,
      entityId: data.entityId || null,
      assignedTo: data.assignedTo || null,
      description: data.description || null,
      entityType: data.entityType || null,
      dueDate: data.dueDate || null,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(tasks).values(newTask);
    return this.findById(newTask.id, data.organizationId) as Promise<Task>;
  },

  async update(id: string, organizationId: string, data: Partial<Task>, userId: string): Promise<Task | null> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }

    const partialSchema = taskSchema.partial();
    const validated = partialSchema.parse(data);

    const updated = {
      ...validated,
      updatedAt: new Date().toISOString(),
    };
    
    // Explicitly map undefined to null or omit
    const finalUpdate: any = { ...updated };
    if (data.entityId === undefined) delete finalUpdate.entityId;
    if (data.assignedTo === undefined) delete finalUpdate.assignedTo;
    if (data.description === undefined) delete finalUpdate.description;
    if (data.entityType === undefined) delete finalUpdate.entityType;

    await db.update(tasks)
      .set(finalUpdate)
      .where(and(eq(tasks.id, id), eq(tasks.organizationId, organizationId)));
    return await this.findById(id, organizationId);
  },

  async markAsDone(id: string, organizationId: string, userId: string): Promise<Task | null> {
    return this.update(id, organizationId, { status: 'completed' }, userId);
  },

  async delete(id: string, organizationId: string, userId: string): Promise<void> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.organizationId, organizationId)));
  },
};
