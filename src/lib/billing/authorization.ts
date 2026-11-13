import 'server-only';
import { db } from '@/lib/db/server';
import { clients, users } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { AppError } from '@/lib/errors';

type BillingDb = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
type BillingResource = {
  organizationId: string;
  clientId: string;
  recipientUserId?: string | null;
};

/** userId must come from the verified server session, never request input. */
export async function getBillingAuthority(
  resource: BillingResource,
  userId: string,
  connection: BillingDb = db,
): Promise<'issuer' | 'recipient' | null> {
  const [actor] = await connection
    .select({ profileType: users.profileType, organizationId: users.organizationId })
    .from(users).where(and(eq(users.id, userId),isNull(users.accountClosedAt))).limit(1).for('share');

  if (actor?.profileType === 'professional') {
    return actor.organizationId === resource.organizationId ? 'issuer' : null;
  }
  if (actor?.profileType !== 'client') return null;
  if (resource.recipientUserId === userId) return 'recipient';

  const [linkedClient] = await connection.select({ id: clients.id }).from(clients)
    .where(and(
      eq(clients.id, resource.clientId),
      eq(clients.organizationId, resource.organizationId),
      eq(clients.userId, userId),
    )).limit(1);
  return linkedClient ? 'recipient' : null;
}

export async function requireClientBillingAuthority(
  resource: BillingResource, userId: string, connection: BillingDb = db,
): Promise<void> {
  if (await getBillingAuthority(resource, userId, connection) !== 'recipient') {
    throw new AppError('Accès refusé à ce document', 403, 'FORBIDDEN');
  }
}

export async function requireBillingReadAuthority(
  resource: BillingResource, userId: string, connection: BillingDb = db,
): Promise<'issuer' | 'recipient'> {
  const authority = await getBillingAuthority(resource, userId, connection);
  if (!authority) throw new AppError('Accès refusé à ce document', 403, 'FORBIDDEN');
  return authority;
}
