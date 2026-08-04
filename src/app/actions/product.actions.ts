'use server';

import { productService } from '@/lib/services/product.service';
import { cookies } from 'next/headers';

export async function findAllAction(organizationId?: any) {
  return await productService.findAll(organizationId);
}

export async function findByIdAction(id?: any, organizationId?: any) {
  return await productService.findById(id, organizationId);
}

export async function createAction(data?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await productService.create(data, userId);
}

export async function updateAction(id?: any, organizationId?: any, data?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await productService.update(id, organizationId, data, userId);
}

export async function deleteAction(id?: any, organizationId?: any, userId?: any) {
  if (!userId) {
    const cookieStore = await cookies();
    userId = cookieStore.get('session')?.value;
  }
  return await productService.delete(id, organizationId, userId);
}

