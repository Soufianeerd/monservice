import 'server-only';
import postgres from 'postgres';
import { createSecurityScopedClient } from '@/lib/db/security-context';

// This capability receives the identity returned directly by the managed signup
// SDK. It is never a server action and never reads an identity from browser data.
let connection: postgres.Sql | undefined;
export async function provisionSignupIdentity(providerId: string, input: {
  profileType: string; orgName?: string; sector?: string; profession?: string;
}) {
  const url = process.env.NEON_RUNTIME_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('Restricted runtime database missing');
  connection ??= postgres(url, { prepare: false, max: 1, idle_timeout: 20 });
  const scoped = createSecurityScopedClient(connection, async () => providerId);
  const rows = await scoped.unsafe('select public.provision_app_user($1,$2,$3,$4,$5) as id', [providerId,input.profileType,input.orgName ?? null,input.sector ?? null,input.profession ?? null]);
  return typeof rows[0]?.id === 'string' ? rows[0].id : undefined;
}
