'use server';

import { searchService } from '@/lib/services/search.service';
import { cookies } from 'next/headers';

export async function searchAction(query: string = '', organizationId: string = '') {
  return await searchService.search(query, organizationId);
}

