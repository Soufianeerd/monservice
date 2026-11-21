// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type postgres from 'postgres';
import { createSecurityScopedClient, hasActiveTransaction } from '@/lib/db/security-context';

/** Faux client postgres.js : enregistre ce que la transaction exécute. */
function fakeClient() {
  const log: string[] = [];
  const tx = Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.join('?');
      log.push(`tx:${text.includes('pg_roles') ? 'role-check' : text.includes('set_config') ? `identity=${String(values[0])}` : text}`);
      return Promise.resolve(text.includes('pg_roles')
        ? [{ name: 'monservice_runtime', rolbypassrls: false, rolsuper: false, rolinherit: false }]
        : [{}]);
    },
    {
      unsafe: (query: string) => { log.push(`tx:${query}`); return Object.assign(Promise.resolve([]), { values: () => Promise.resolve([]) }); },
      savepoint: vi.fn(),
    },
  );
  const begin = vi.fn(async (callback: (t: typeof tx) => Promise<unknown>) => {
    log.push('BEGIN');
    const result = await callback(tx);
    log.push('COMMIT');
    return result;
  });
  return { client: { begin } as unknown as postgres.Sql, begin, tx, log };
}

const state = vi.hoisted(() => ({ scoped: undefined as postgres.Sql | undefined }));
vi.mock('@/lib/db/server', () => ({
  db: { transaction: (fn: () => Promise<unknown>) => state.scoped!.begin(() => fn()) },
}));

import { withReadScope } from '@/lib/db/read-scope';

describe('withReadScope : une transaction de lecture par page', () => {
  let fake: ReturnType<typeof fakeClient>;
  beforeEach(() => {
    fake = fakeClient();
    state.scoped = createSecurityScopedClient(fake.client, async () => 'provider-user');
  });

  it('exécute toutes les lectures du lot dans une seule transaction, identité posée une fois', async () => {
    expect(hasActiveTransaction()).toBe(false);
    await withReadScope(async () => {
      expect(hasActiveTransaction()).toBe(true);
      await Promise.all([state.scoped!.unsafe('select a'), state.scoped!.unsafe('select b'), state.scoped!.unsafe('select c')]);
    });
    expect(hasActiveTransaction()).toBe(false);
    expect(fake.begin).toHaveBeenCalledTimes(1);
    expect(fake.log).toEqual(['BEGIN', 'tx:role-check', 'tx:identity=provider-user', 'tx:select a', 'tx:select b', 'tx:select c', 'COMMIT']);
  });

  it('réutilise la transaction ouverte au lieu de créer un SAVEPOINT', async () => {
    await withReadScope(() => withReadScope(async () => { await state.scoped!.unsafe('select nested'); }));
    expect(fake.begin).toHaveBeenCalledTimes(1);
    expect(fake.tx.savepoint).not.toHaveBeenCalled();
    expect(fake.log).toContain('tx:select nested');
  });

  it('sans lot, chaque requête ouvre sa propre transaction (comportement inchangé)', async () => {
    await Promise.all([state.scoped!.unsafe('select a'), state.scoped!.unsafe('select b')]);
    expect(fake.begin).toHaveBeenCalledTimes(2);
  });

  it('une erreur dans le lot remonte telle quelle', async () => {
    await expect(withReadScope(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(hasActiveTransaction()).toBe(false);
  });
});
