import { clientRepository } from '@/lib/data';
import { Client } from '@/lib/data/interfaces';

export async function getClientWithFallback(
  clientId: string | undefined,
  organizationId: string
): Promise<{ client: Client | null; exists: boolean }> {
  if (!clientId) return { client: null, exists: false };
  try {
    const client = await clientRepository.getById(clientId);
    if (client && client.organizationId === organizationId) {
      return { client, exists: true };
    }
    return { client: null, exists: false };
  } catch {
    return { client: null, exists: false };
  }
}
