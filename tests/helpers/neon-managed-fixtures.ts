import type postgres from 'postgres';
import { enterVerifiedProvider, getTestProviderSession, withVerifiedProvider, registerVerifiedSession } from './neon-auth-context';
import { vi } from 'vitest';

vi.mock('@/lib/auth/server', async () => {
  const { getTestProviderSession } = await import('./neon-auth-context');
  return { auth: { getSession: getTestProviderSession, signOut: vi.fn() } };
});
const providers = new Map<string, string>();

// These are actual managed Auth accounts and verified HTTP sessions. Only the
// test fixture owner writes their stable business-ID mapping on an isolated DB.
export async function provisionManagedFixture(sql: postgres.Sql, appUserId: string) {
  if (!process.env.NEON_BRANCH || process.env.NEON_BRANCH === 'production') throw new Error('Synthetic branch required');
  const [user] = await sql`select email from public.users where id=${appUserId}`;
  const base = process.env.NEON_AUTH_BASE_URL!;
  let response: Response | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    response = await fetch(`${base}/sign-up/email`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3039' }, body: JSON.stringify({ email: user.email, name: 'Synthetic security fixture', password: process.env.E2E_AUTH_PASSWORD }), signal: AbortSignal.timeout(20000) });
    if (response.status !== 429) break;
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
  if (!response?.ok) throw new Error('Managed fixture registration failed');
  const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  const verified = await fetch(`${base}/get-session`, { headers: { cookie }, signal: AbortSignal.timeout(20000) });
  const session = await verified.json();
  if (!verified.ok || !session?.user?.id || session.user.email !== user.email) throw new Error('Managed fixture session verification failed');
  registerVerifiedSession(session.user.id,session.session.id);
  await sql`insert into public.user_identities(app_user_id,provider,provider_user_id,verified_at,linkage_method) values(${appUserId},'neon',${session.user.id},now(),'synthetic_fixture')`;
  providers.set(appUserId, session.user.id);
  return session.user.id as string;
}
export function selectManagedFixture(appUserId: string) {
  const provider = providers.get(appUserId);
  if (!provider) throw new Error('Verified fixture unavailable');
  enterVerifiedProvider(provider);
}
export const managedFixtureSession = getTestProviderSession;
export function runManagedFixture<T>(appUserId: string, work: () => T): T {
  const provider = providers.get(appUserId);
  if (!provider) throw new Error('Verified fixture unavailable');
  return withVerifiedProvider(provider, work);
}
