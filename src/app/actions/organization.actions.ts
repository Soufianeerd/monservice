'use server';

import { organizationService } from '@/lib/services/organization.service';
import { Organization } from '@/lib/data/interfaces';
import { cookies } from 'next/headers';

export async function getByIdAction(id: string) {
  try {
    return await organizationService.getById(id);
  } catch (error) {
    console.error('Error fetching organization:', error);
    throw new Error('Failed to fetch organization');
  }
}

export async function updateAction(id: string, data: Partial<Organization>) {
  try {
    return await organizationService.update(id, data);
  } catch (error) {
    console.error('Error updating organization:', error);
    throw new Error('Failed to update organization');
  }
}
