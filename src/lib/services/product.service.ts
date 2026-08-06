import { db } from '../db/server';
import { products } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '../utils/id-generator';
import { Product } from '../data/interfaces';
import { productSchema } from '../validation/schemas';
import { AppError } from '@/lib/errors';
import { userService } from './user.service';

export const productService = {
  async findAll(organizationId: string): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.organizationId, organizationId));
  },

  async findById(id: string, organizationId: string): Promise<Product | null> {
    const result = await db.select().from(products).where(
      and(eq(products.id, id), eq(products.organizationId, organizationId))
    );
    return result[0] || null;
  },

  async create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Product> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== data.organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }

    const validated = productSchema.parse(data);

    const now = new Date().toISOString();
    const newProduct = {
      id: generateId(),
      ...validated,
      description: validated.description || null,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(products).values(newProduct);
    return newProduct;
  },

  async update(id: string, organizationId: string, data: Partial<Product>, userId: string): Promise<Product | null> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }

    const partialSchema = productSchema.partial();
    const validated = partialSchema.parse(data);

    const updated = {
      ...validated,
      updatedAt: new Date().toISOString(),
    };
    await db.update(products)
      .set(updated)
      .where(and(eq(products.id, id), eq(products.organizationId, organizationId)));
    return await this.findById(id, organizationId);
  },

  async delete(id: string, organizationId: string, userId: string): Promise<void> {
    const user = await userService.getUserProfile(userId);
    if (!user || user.organizationId !== organizationId) {
      throw new AppError('Unauthorized access to this organization', 403, 'UNAUTHORIZED');
    }
    await db.delete(products).where(and(eq(products.id, id), eq(products.organizationId, organizationId)));
  },
};
