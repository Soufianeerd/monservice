import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import postgres from 'postgres';
import { withFixtureMaintenance } from '../helpers/neon-fixtures';
import { createRlsTestClient, NeonRlsClient } from '../helpers/neon-rls-client';

// 0017/0018 — invitation d'un client au portail : création et révocation par
// le professionnel de l'organisation, acceptation par le seul compte client
// de l'adresse invitée, lien fiche ↔ compte inaccessible au rôle runtime.
const DATABASE_URL = process.env.NEON_ADMIN_DATABASE_URL!;
const PASSWORD = process.env.E2E_AUTH_PASSWORD!;

const orgA = 'org-a-1234';
const fiche = 'cli-invite-test';
const ficheTaken = 'cli-invite-test-taken';
const inviteeEmail = 'client_generic_b@monservice.invalid';

const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');

async function signIn(client: NeonRlsClient, email: string) {
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data?.user) throw new Error(`Mandatory authentication failed for ${email}`);
  return data.appUserId as string;
}

describe('Client portal invitations (0017/0018)', () => {
  let sql: postgres.Sql;
  let anon: NeonRlsClient;
  let proA: NeonRlsClient;
  let proB: NeonRlsClient;
  let invitee: NeonRlsClient;
  let otherClient: NeonRlsClient;
  let proAUserId: string;
  let inviteeUserId: string;
  let otherClientUserId: string;

  const cleanup = () =>
    withFixtureMaintenance(sql, async (tx) => {
      await tx`DELETE FROM client_portal_invitations WHERE client_id IN (${fiche}, ${ficheTaken})`;
      await tx`DELETE FROM clients WHERE id IN (${fiche}, ${ficheTaken})`;
    });

  const invite = (client: NeonRlsClient, id: string, token: string, extra: Record<string, unknown> = {}) =>
    client.from('client_portal_invitations').insert({
      id, organization_id: orgA, client_id: fiche, email: inviteeEmail, token_hash: hash(token),
      created_by_user_id: proAUserId, expires_at: new Date(Date.now() + 14 * 86400000).toISOString(), ...extra,
    }).select('id');

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
    anon = createRlsTestClient();
    proA = createRlsTestClient();
    proAUserId = await signIn(proA, 'pro_a@monservice.invalid');
    proB = createRlsTestClient();
    await signIn(proB, 'pro_b@monservice.invalid');
    invitee = createRlsTestClient();
    inviteeUserId = await signIn(invitee, inviteeEmail);
    otherClient = createRlsTestClient();
    otherClientUserId = await signIn(otherClient, 'client_b@monservice.invalid');

    await cleanup();
    const now = new Date().toISOString();
    await sql`INSERT INTO clients (id, organization_id, name, email, created_at, updated_at)
      VALUES (${fiche}, ${orgA}, 'Fiche invitation', ${inviteeEmail}, ${now}, ${now}),
             (${ficheTaken}, ${orgA}, 'Fiche déjà reliée', 'deja@monservice.invalid', ${now}, ${now})`;
    await sql`UPDATE clients SET user_id = ${otherClientUserId} WHERE id = ${ficheTaken}`;
  });

  afterAll(async () => {
    await cleanup();
    await sql.end();
  });

  it('denies anonymous access to invitations and portal functions', async () => {
    expect((await anon.from('client_portal_invitations').select('id')).data ?? []).toHaveLength(0);
    expect((await invite(anon, 'inv-test-anon', newToken())).error).not.toBeNull();
    expect((await anon.rpc('accept_client_portal_invitation', [hash(newToken())])).error).not.toBeNull();
    expect((await anon.rpc('unlink_client_portal_account', [fiche])).error).not.toBeNull();
  });

  it('lets only the owning organization professional create an invitation, with server-owned fields', async () => {
    expect((await invite(proB, 'inv-test-cross', newToken())).error).not.toBeNull();
    expect((await invite(invitee, 'inv-test-client', newToken())).error).not.toBeNull();

    const token = newToken();
    const created = await invite(proA, 'inv-test-1', token, { expires_at: new Date(Date.now() + 365 * 86400000).toISOString() });
    expect(created.error).toBeNull();
    const [row] = await sql`SELECT created_by_user_id, expires_at, accepted_at FROM client_portal_invitations WHERE id = 'inv-test-1'`;
    expect(row.created_by_user_id).toBe(proAUserId);
    expect(new Date(row.expires_at).getTime()).toBeLessThanOrEqual(Date.now() + 30 * 86400000 + 60000);
    expect(row.accepted_at).toBeNull();

    // Une seule invitation en attente par fiche.
    expect((await invite(proA, 'inv-test-dup', newToken())).error).not.toBeNull();
    // Jamais visible hors de l'organisation, ni par un compte client.
    expect((await proB.from('client_portal_invitations').select('id').eq('id', 'inv-test-1')).data ?? []).toHaveLength(0);
    expect((await invitee.from('client_portal_invitations').select('id').eq('id', 'inv-test-1')).data ?? []).toHaveLength(0);
  });

  it('only allows revoking a pending invitation, never editing or deleting it', async () => {
    const edit = await proA.from('client_portal_invitations').update({ email: 'pirate@monservice.invalid' }).eq('id', 'inv-test-1').select('id');
    expect(edit.error).not.toBeNull();
    const del = await proA.from('client_portal_invitations').delete().eq('id', 'inv-test-1').select('id');
    expect(del.error).not.toBeNull();
    const revoke = await proA.from('client_portal_invitations').update({ revoked_at: new Date().toISOString() }).eq('id', 'inv-test-1').select('id');
    expect(revoke.error).toBeNull();
    const again = await proA.from('client_portal_invitations').update({ revoked_at: new Date().toISOString() }).eq('id', 'inv-test-1').select('id');
    expect(again.error).not.toBeNull();
  });

  it('refuses a revoked token and a different account email', async () => {
    const revokedToken = await sql`SELECT token_hash FROM client_portal_invitations WHERE id = 'inv-test-1'`;
    expect((await invitee.rpc('accept_client_portal_invitation', [revokedToken[0].token_hash])).error).not.toBeNull();

    const token = newToken();
    expect((await invite(proA, 'inv-test-2', token)).error).toBeNull();
    const preview = await otherClient.rpc('preview_client_portal_invitation', [hash(token)]);
    expect(preview.data?.[0]?.email_matches).toBe(false);
    expect((await otherClient.rpc('accept_client_portal_invitation', [hash(token)])).error?.message).toContain('Invitation email mismatch');
    expect((await proA.rpc('accept_client_portal_invitation', [hash(token)])).error).not.toBeNull();
    const [row] = await sql`SELECT user_id FROM clients WHERE id = ${fiche}`;
    expect(row.user_id).toBeNull();
  });

  it('links the fiche to the invited client account exactly once', async () => {
    const [pending] = await sql`SELECT token_hash FROM client_portal_invitations WHERE id = 'inv-test-2'`;
    const preview = await invitee.rpc('preview_client_portal_invitation', [pending.token_hash]);
    expect(preview.data?.[0]).toMatchObject({ state: 'pending', email_matches: true });

    const accepted = await invitee.rpc('accept_client_portal_invitation', [pending.token_hash]);
    expect(accepted.error).toBeNull();
    expect(accepted.data?.[0]).toMatchObject({ client_id: fiche, organization_id: orgA });
    const [link] = await sql`SELECT user_id FROM clients WHERE id = ${fiche}`;
    expect(link.user_id).toBe(inviteeUserId);
    const [inv] = await sql`SELECT accepted_by_user_id FROM client_portal_invitations WHERE id = 'inv-test-2'`;
    expect(inv.accepted_by_user_id).toBe(inviteeUserId);

    // Usage unique ; la fiche reliée devient lisible par son client.
    expect((await invitee.rpc('accept_client_portal_invitation', [pending.token_hash])).error).not.toBeNull();
    expect((await invitee.from('clients').select('id').eq('id', fiche)).data).toHaveLength(1);
  });

  it('never lets the runtime role rewrite the fiche link directly', async () => {
    const hijack = await proA.from('clients').update({ user_id: otherClientUserId }).eq('id', fiche).select('id');
    expect(hijack.error).not.toBeNull();
    const [row] = await sql`SELECT user_id FROM clients WHERE id = ${fiche}`;
    expect(row.user_id).toBe(inviteeUserId);
    // Une modification ordinaire de la fiche reste possible.
    expect((await proA.from('clients').update({ notes: 'Note de test' }).eq('id', fiche).select('id')).error).toBeNull();
  });

  it('refuses to take over a fiche already linked to another account', async () => {
    const token = newToken();
    await sql`INSERT INTO client_portal_invitations (id, organization_id, client_id, email, token_hash, created_by_user_id, expires_at)
      VALUES ('inv-test-taken', ${orgA}, ${ficheTaken}, ${inviteeEmail}, ${hash(token)}, ${proAUserId}, now() + interval '1 day')`;
    expect((await invitee.rpc('preview_client_portal_invitation', [hash(token)])).data?.[0]?.state).toBe('unavailable');
    expect((await invitee.rpc('accept_client_portal_invitation', [hash(token)])).error?.message).toContain('Client record already linked');
  });

  it('lets only the owning professional remove access', async () => {
    expect((await proB.rpc('unlink_client_portal_account', [fiche])).error).not.toBeNull();
    expect((await invitee.rpc('unlink_client_portal_account', [fiche])).error).not.toBeNull();
    const unlinked = await proA.rpc('unlink_client_portal_account', [fiche]);
    expect(unlinked.error).toBeNull();
    const [row] = await sql`SELECT user_id FROM clients WHERE id = ${fiche}`;
    expect(row.user_id).toBeNull();
    expect((await invitee.from('clients').select('id').eq('id', fiche)).data ?? []).toHaveLength(0);
  });
});
