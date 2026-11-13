import type postgres from 'postgres';

/** Owner-only fixture cleanup on a synthetic branch. Neon does not grant the
 * superuser-only session_replication_role setting. FK triggers stay enabled;
 * business immutability triggers are restored in the same atomic transaction.
 */
export async function withFixtureMaintenance<T>(connection: postgres.Sql, cleanup: (tx: postgres.TransactionSql) => Promise<T>) {
  if (!process.env.NEON_BRANCH || process.env.NEON_BRANCH === 'production') throw new Error('Synthetic branch required for fixture cleanup');
  return connection.begin(async tx => {
    const tables = await tx<{ name: string }[]>`select tablename as name from pg_tables where schemaname='public' and tableowner=current_user`;
    if (!tables.length) throw new Error('Fixture owner connection required');
    for (const table of tables) await tx.unsafe(`ALTER TABLE public."${table.name.replaceAll('"', '""')}" DISABLE TRIGGER USER`);
    // Delete only mappings for synthetic Gate fixtures, never the base E2E users.
    await tx`delete from public.user_identities i using public.users u where i.app_user_id=u.id and i.linkage_method='synthetic_fixture' and (u.email like '%@example.test' or u.email like 'closed-%@account.invalid')`;
    const result = await cleanup(tx);
    for (const table of tables) await tx.unsafe(`ALTER TABLE public."${table.name.replaceAll('"', '""')}" ENABLE TRIGGER USER`);
    return result;
  });
}
