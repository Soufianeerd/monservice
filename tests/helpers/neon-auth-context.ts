import { AsyncLocalStorage } from 'node:async_hooks';

// Only the test HTTP login helper installs identities verified by Managed Auth.
const sessions = new AsyncLocalStorage<{ user: { id: string }; session: { id: string } }>();
const verifiedSessionIds = new Map<string,string>();
export const registerVerifiedSession = (providerId: string, sessionId: string) => verifiedSessionIds.set(providerId,sessionId);
const sessionFor = (id: string) => ({ user: { id }, session: { id: verifiedSessionIds.get(id) ?? '' } });
export const enterVerifiedProvider = (providerUserId: string) => sessions.enterWith(sessionFor(providerUserId));
export function withVerifiedProvider<T>(providerUserId: string | null, callback: () => T): T {
  return sessions.run(sessionFor(providerUserId ?? ''), callback);
}
export async function getTestProviderSession() {
  const session = sessions.getStore();
  return { data: session?.user.id ? session : null, error: null };
}
