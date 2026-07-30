import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@/lib/utils/id-generator';
import { Product } from '@/lib/data/interfaces';

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

  async create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const now = new Date().toISOString();
    const newProduct = {
      id: generateId(),
      ...data,
      description: data.description || null,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(products).values(newProduct);
    return newProduct;
  },

  async update(id: string, organizationId: string, data: Partial<Product>): Promise<Product | null> {
    const updated = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await db.update(products)
      .set(updated)
      .where(and(eq(products.id, id), eq(products.organizationId, organizationId)));
    return await this.findById(id, organizationId);
  },

  async delete(id: string, organizationId: string): Promise<void> {
    await db.delete(products).where(and(eq(products.id, id), eq(products.organizationId, organizationId)));
  },
};
