import { db } from '../db';
import { requests } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { Request } from '../data/interfaces/request.interface';
import { generateId } from '../utils/id-generator';
import { requestSchema } from '../validation/schemas';
import { AppError } from '../utils/error-handler';
import { userService } from './user.service';


export const requestService = {
  async findAll(): Promise<Request[]> {
    const results = await db.select().from(requests);
    return results.map(r => ({
      ...r,
      budget: r.budget ? parseFloat(r.budget) : undefined,
      preferredDate: r.deadline || undefined,
      location: '', // not in schema
      isPublic: r.visibility === 'public',
      status: r.status as any,
    }));
  },

  async findPublic(): Promise<Request[]> {
    const results = await db.select().from(requests).where(eq(requests.visibility, 'public'));
    return results.map(r => ({
      ...r,
      budget: r.budget ? parseFloat(r.budget) : undefined,
      preferredDate: r.deadline || undefined,
      location: '',
      isPublic: true,
      status: r.status as any,
    }));
  },

  async findById(id: string): Promise<Request | null> {
    const result = await db.select().from(requests).where(eq(requests.id, id));
    if (!result[0]) return null;
    return {
      ...result[0],
      budget: result[0].budget ? parseFloat(result[0].budget) : undefined,
      preferredDate: result[0].deadline || undefined,
      location: '',
      isPublic: result[0].visibility === 'public',
      status: result[0].status as any,
    };
  },

  async findByClientId(clientId: string): Promise<Request[]> {
    const results = await db.select().from(requests).where(eq(requests.clientId, clientId));
    return results.map(r => ({
      ...r,
      budget: r.budget ? parseFloat(r.budget) : undefined,
      preferredDate: r.deadline || undefined,
      location: '',
      isPublic: r.visibility === 'public',
      status: r.status as any,
    }));
  },

  async create(data: Omit<Request, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Request> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.id !== data.clientId) {
      throw new AppError('Unauthorized to create request for this client', 403, 'UNAUTHORIZED');
    }

    const validated = requestSchema.parse({
      ...data,
      deadline: data.preferredDate,
      visibility: data.isPublic ? 'public' : 'private',
    });

    const id = generateId();
    const now = new Date().toISOString();
    
    await db.insert(requests).values({
      id,
      clientId: data.clientId,
      title: validated.title,
      description: validated.description,
      category: validated.category,
      budget: validated.budget ? validated.budget.toString() : null,
      deadline: validated.deadline || null,
      status: validated.status as any,
      visibility: validated.visibility as any,
      createdAt: now,
      updatedAt: now,
    });
    
    return this.findById(id) as Promise<Request>;
  },

  async update(id: string, data: Partial<Omit<Request, 'id' | 'createdAt' | 'updatedAt'>>, userId: string): Promise<Request | null> {
    const req = await this.findById(id);
    if (!req) throw new AppError('Request not found', 404, 'NOT_FOUND');
    if (req.clientId !== userId) throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');

    const updates: any = { updatedAt: new Date().toISOString() };
    
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.category !== undefined) updates.category = data.category;
    if (data.budget !== undefined) updates.budget = data.budget ? data.budget.toString() : null;
    if (data.preferredDate !== undefined) updates.deadline = data.preferredDate;
    if (data.status !== undefined) updates.status = data.status;
    if (data.isPublic !== undefined) updates.visibility = data.isPublic ? 'public' : 'private';

    await db.update(requests).set(updates).where(eq(requests.id, id));
    
    return this.findById(id);
  },

  async publish(id: string, userId: string): Promise<Request | null> {
    const request = await this.findById(id);
    if (!request) throw new AppError('Request not found', 404, 'NOT_FOUND');
    if (request.clientId !== userId) throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
    if (request.status === 'published') throw new AppError('Already published', 400, 'BAD_REQUEST');

    await db.update(requests)
      .set({ status: 'published', visibility: 'public', updatedAt: new Date().toISOString() })
      .where(eq(requests.id, id));

    return this.findById(id);
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const req = await this.findById(id);
    if (!req) return false;
    if (req.clientId !== userId) throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');

    await db.delete(requests).where(eq(requests.id, id));
    return true;
  }
};
