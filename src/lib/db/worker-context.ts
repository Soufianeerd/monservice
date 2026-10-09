import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';

export type WorkerAuthority = {
  kind: 'stripe' | 'reminders';
  eventId?: string;
  subjectId?: string;
};
const authority = new AsyncLocalStorage<WorkerAuthority>();
export const getWorkerAuthority = () => authority.getStore();

// Server routes install this context only after signature/cron-secret verification.
// No action, request body, header or URL selects a database role.
export function withWorkerDatabase<T>(verifiedAuthority: WorkerAuthority, callback: () => Promise<T>) {
  if (authority.getStore()) throw new Error('Nested worker authority denied');
  return authority.run(verifiedAuthority, callback);
}
