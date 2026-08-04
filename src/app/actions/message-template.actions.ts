'use server';

import { messageTemplateService } from '@/lib/services/message-template.service';
import { cookies } from 'next/headers';

export async function findAllAction(organizationId: string) {
  try {
    return await messageTemplateService.findAll(organizationId);
  } catch (error) {
    console.error('Error fetching message templates:', error);
    throw new Error('Failed to fetch message templates');
  }
}

export async function getByIdAction(id: any) { return null; }
export async function updateAction(id: any, data: any) { return null; }
export async function createAction(data: any) { return null; }
export async function deleteAction(id: any) { return null; }
