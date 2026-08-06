'use server';

import { searchService } from '@/lib/services/search.service';
import { requireProfessional } from '@/lib/auth/session';

/**
 * Les paramètres préfixés par `_` sont conservés pour la compatibilité des
 * appelants, mais leur valeur est ignorée : l'identité et l'organisation
 * proviennent exclusivement de la session serveur (MS-002, MS-005, MS-006).
 */

export async function searchAction(query: string = '', _legacyOrganizationId?: unknown) {
  const { organizationId } = await requireProfessional();
  return searchService.search(query, organizationId);
}
