import { AsyncLocalStorage } from 'node:async_hooks';
import type postgres from 'postgres';

type TransactionClient = postgres.TransactionSql;
const transactions = new AsyncLocalStorage<{ client: postgres.Sql; tx: TransactionClient }>();

/** Every Drizzle query and transaction uses the restricted connection. Identity is
 * resolved by a trusted server callback and installed only inside BEGIN/COMMIT.
 * Queries issued through the global db inside a transaction reuse that connection.
 */
export function createSecurityScopedClient(
  client: postgres.Sql,
  getProviderUserId: () => Promise<string | null>,
  getConnection?: () => { client: postgres.Sql; role: string; settings: Record<string, string> },
): postgres.Sql {
  const connection = () => getConnection?.() ?? { client, role: 'monservice_runtime', settings: {} };
  const currentTransaction = () => {
    const current = transactions.getStore();
    if (current && current.client !== connection().client) throw new Error('Cross-authority transaction denied');
    return current?.tx;
  };
  const begin = async <T>(callback: (tx: TransactionClient) => Promise<T>): Promise<T> => {
    const selected = connection();
    const existing = currentTransaction();
    if (existing) return existing.savepoint(tx => transactions.run({ client: selected.client, tx }, () => callback(tx))) as Promise<T>;
    const providerUserId = selected.role === 'monservice_runtime' ? await getProviderUserId() : null;
    return selected.client.begin(async tx => {
      const [role] = await tx`select current_user as name,rolbypassrls,rolsuper,rolinherit from pg_roles where rolname=current_user`;
      if (role.name !== selected.role || !['monservice_runtime', 'monservice_stripe', 'monservice_reminders'].includes(role.name) || role.rolbypassrls || role.rolsuper || role.rolinherit) throw new Error('Unsafe database runtime role');
      await tx`select set_config('monservice.provider_user_id', ${providerUserId ?? ''}, true)`;
      for (const [key, value] of Object.entries(selected.settings)) await tx`select set_config(${key},${value},true)`;
      return transactions.run({ client: selected.client, tx }, () => callback(tx));
    }) as Promise<T>;
  };
  return new Proxy(client, {
    get(target, property) {
      if (property === 'begin') return (callback: (tx: TransactionClient) => Promise<unknown>) => begin(callback);
      if (property === 'unsafe') return (query: string, params: postgres.ParameterOrJSON<never>[] = []) => {
        let pending: Promise<unknown> | undefined;
        const execute = (values: boolean) => pending ??= (async () => {
          const current = currentTransaction();
          const run = (tx: TransactionClient) => values ? tx.unsafe(query, params).values() : tx.unsafe(query, params);
          return current ? run(current) : begin(async tx => run(tx));
        })();
        return {
          then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => execute(false).then(resolve, reject),
          values: () => execute(true),
        };
      };
      return Reflect.get(target, property);
    },
  });
}
