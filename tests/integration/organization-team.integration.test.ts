import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import postgres from 'postgres';
import { createRlsTestClient, NeonRlsClient } from '../helpers/neon-rls-client';

// 0019 — équipe d'une organisation : invitations réservées aux
// administrateurs, rattachement uniquement par accept_organization_invitation
// (adresse vérifiée = adresse invitée), retrait qui coupe tout accès.
const DATABASE_URL = process.env.NEON_ADMIN_DATABASE_URL!;
const PASSWORD = process.env.E2E_AUTH_PASSWORD!;

const orgA = 'org-generic-a-1234';
const orgB = 'org-generic-b-5678';
const inviteeEmail = 'pro_team_db@monservice.invalid';
const ids = ['team-db-1', 'team-db-2', 'team-db-3', 'team-db-4', 'team-db-cross', 'team-db-member'];

const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');

async function signIn(client: NeonRlsClient, email: string) {
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data?.user) throw new Error(`Mandatory authentication failed for ${email}`);
  return data.appUserId as string;
}

describe('Organization team (0019)', () => {
  let sql: postgres.Sql;
  let anon: NeonRlsClient;
  let adminA: NeonRlsClient;
  let adminB: NeonRlsClient;
  let invitee: NeonRlsClient;
  let clientA: NeonRlsClient;
  let adminAId: string;
  let inviteeId: string;

  // Le compte invité redevient un professionnel sans organisation, sans rôle
  // ni retrait ; ses invitations et les rôles explicites de l'organisation A
  // sont effacés (opérations du propriétaire, jamais du rôle runtime).
  const reset = async () => {
    await sql`DELETE FROM organization_invitations WHERE id = ANY(${ids}) OR email = ${inviteeEmail}`;
    await sql`DELETE FROM organization_member_removals WHERE user_id = ${inviteeId}`;
    await sql`DELETE FROM user_roles WHERE organization_id IN (${orgA}, ${orgB}) AND role_id = 'role-org-admin'`;
    await sql`UPDATE users SET organization_id = NULL WHERE id = ${inviteeId}`;
  };

  const invite = (client: NeonRlsClient, id: string, token: string, extra: Record<string, unknown> = {}) =>
    client.from('organization_invitations').insert({
      id, organization_id: orgA, email: inviteeEmail, role: 'member', token_hash: hash(token),
      created_by_user_id: adminAId, expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), ...extra,
    }).select('id');

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
    anon = createRlsTestClient();
    adminA = createRlsTestClient();
    adminAId = await signIn(adminA, 'pro_generic_a@monservice.invalid');
    adminB = createRlsTestClient();
    await signIn(adminB, 'pro_generic_b@monservice.invalid');
    clientA = createRlsTestClient();
    await signIn(clientA, 'client_generic_a@monservice.invalid');
    // Le fournisseur synthétique ne vérifie pas les adresses : la production,
    // si. Le test marque l'adresse vérifiée, puis teste aussi le refus.
    await sql`UPDATE neon_auth."user" SET "emailVerified" = true WHERE email = ${inviteeEmail}`;
    invitee = createRlsTestClient();
    inviteeId = await signIn(invitee, inviteeEmail);
    await reset();
  });

  afterAll(async () => {
    await reset();
    await sql.end();
  });

  it('makes the founder an implicit administrator without writing roles at signup', async () => {
    expect((await adminA.rpc('current_user_is_organization_admin')).data?.[0]?.current_user_is_organization_admin).toBe(true);
    expect((await clientA.rpc('current_user_is_organization_admin')).data?.[0]?.current_user_is_organization_admin).toBe(false);
    expect((await invitee.rpc('current_user_is_organization_admin')).data?.[0]?.current_user_is_organization_admin).toBe(false);
  });

  it('lets only an administrator of the organization create invitations, with server-owned fields', async () => {
    expect((await invite(anon, 'team-db-cross', newToken())).error).not.toBeNull();
    expect((await invite(adminB, 'team-db-cross', newToken())).error).not.toBeNull();
    expect((await invite(clientA, 'team-db-cross', newToken())).error).not.toBeNull();
    expect((await invite(invitee, 'team-db-cross', newToken())).error).not.toBeNull();

    const created = await invite(adminA, 'team-db-1', newToken(), { expires_at: new Date(Date.now() + 365 * 86400000).toISOString(), created_by_user_id: inviteeId });
    expect(created.error).toBeNull();
    const [row] = await sql`SELECT created_by_user_id, expires_at FROM organization_invitations WHERE id = 'team-db-1'`;
    expect(row.created_by_user_id).toBe(adminAId);
    expect(new Date(row.expires_at).getTime()).toBeLessThanOrEqual(Date.now() + 30 * 86400000 + 60000);

    expect((await invite(adminA, 'team-db-2', newToken())).error).not.toBeNull(); // une seule en attente par adresse
    expect((await adminB.from('organization_invitations').select('id').eq('id', 'team-db-1')).data ?? []).toHaveLength(0);
    expect((await invitee.from('organization_invitations').select('id').eq('id', 'team-db-1')).data ?? []).toHaveLength(0);
  });

  it('never edits or deletes an invitation; revocation is final', async () => {
    expect((await adminA.from('organization_invitations').update({ role: 'admin' }).eq('id', 'team-db-1').select('id')).error).not.toBeNull();
    expect((await adminA.from('organization_invitations').delete().eq('id', 'team-db-1').select('id')).error).not.toBeNull();
    expect((await adminA.from('organization_invitations').update({ revoked_at: new Date().toISOString() }).eq('id', 'team-db-1').select('id')).error).toBeNull();
    expect((await adminA.from('organization_invitations').update({ revoked_at: new Date().toISOString() }).eq('id', 'team-db-1').select('id')).error).not.toBeNull();
    const [revoked] = await sql`SELECT token_hash FROM organization_invitations WHERE id = 'team-db-1'`;
    expect((await invitee.rpc('accept_organization_invitation', [revoked.token_hash])).error?.message).toContain('Invitation unavailable');
  });

  it('refuses an unverified address and any account other than the invited one', async () => {
    const token = newToken();
    expect((await invite(adminA, 'team-db-3', token)).error).toBeNull();
    expect((await anon.rpc('preview_organization_invitation', [hash(token)])).data?.[0]).toMatchObject({ state: 'pending', email: inviteeEmail, role: 'member' });
    expect((await anon.rpc('accept_organization_invitation', [hash(token)])).error).not.toBeNull();
    expect((await adminB.rpc('accept_organization_invitation', [hash(token)])).error).not.toBeNull();
    expect((await clientA.rpc('accept_organization_invitation', [hash(token)])).error).not.toBeNull();

    await sql`UPDATE neon_auth."user" SET "emailVerified" = false WHERE email = ${inviteeEmail}`;
    try {
      expect((await invitee.rpc('accept_organization_invitation', [hash(token)])).error?.message).toContain('Verified email required');
    } finally {
      await sql`UPDATE neon_auth."user" SET "emailVerified" = true WHERE email = ${inviteeEmail}`;
    }
    const [still] = await sql`SELECT organization_id FROM users WHERE id = ${inviteeId}`;
    expect(still.organization_id).toBeNull();
  });

  it('joins the invited professional exactly once and never through a direct update', async () => {
    expect((await invitee.rpc('current_pending_organization_invitation')).data?.[0]).toMatchObject({ role: 'member' });
    expect((await adminA.from('users').update({ organization_id: orgB }).eq('id', adminAId).select('id')).error).not.toBeNull();

    const accepted = await invitee.rpc('accept_organization_invitation', [null]);
    expect(accepted.error).toBeNull();
    const [joined] = await sql`SELECT organization_id FROM users WHERE id = ${inviteeId}`;
    expect(joined.organization_id).toBe(orgA);
    const [pending] = await sql`SELECT token_hash FROM organization_invitations WHERE id = 'team-db-3'`;
    expect((await invitee.rpc('accept_organization_invitation', [pending.token_hash])).error).not.toBeNull();

    // Membre : accès aux données de l'organisation, pas à la gestion d'équipe.
    expect(((await invitee.from('clients').select('id').eq('organization_id', orgA)).data ?? []).length).toBeGreaterThan(0);
    expect((await invitee.rpc('current_user_is_organization_admin')).data?.[0]?.current_user_is_organization_admin).toBe(false);
    expect((await invitee.from('organization_invitations').select('id')).data ?? []).toHaveLength(0);
    expect((await invitee.rpc('remove_organization_member', [adminAId])).error).not.toBeNull();
    expect((await invitee.rpc('set_organization_member_role', [inviteeId, 'admin'])).error).not.toBeNull();
    const members = (await adminA.rpc('list_organization_members')).data ?? [];
    expect(members.map((m: { user_id: string; role: string }) => `${m.user_id}:${m.role}`)).toEqual(expect.arrayContaining([`${adminAId}:admin`, `${inviteeId}:member`]));
  });

  it('keeps at least one administrator and refuses self-removal', async () => {
    expect((await adminA.rpc('set_organization_member_role', [adminAId, 'member'])).error?.message).toContain('Last organization administrator');
    expect((await adminA.rpc('remove_organization_member', [adminAId])).error?.message).toContain('cannot remove themselves');
    expect((await adminB.rpc('remove_organization_member', [inviteeId])).error).not.toBeNull();
  });

  it('cuts every access of a removed member and lets an administrator invite them back', async () => {
    expect((await adminA.rpc('remove_organization_member', [inviteeId])).error).toBeNull();
    expect((await invitee.rpc('current_account_is_active')).data?.[0]?.current_account_is_active).toBe(false);
    expect((await invitee.from('clients').select('id')).data ?? []).toHaveLength(0);
    expect((await invitee.from('users').select('id')).data ?? []).toHaveLength(0);
    expect((await invitee.rpc('current_organization_removal')).data?.[0]?.organization_name).toBeTruthy();
    const members = (await adminA.rpc('list_organization_members')).data ?? [];
    expect(members.some((m: { user_id: string }) => m.user_id === inviteeId)).toBe(false);

    const token = newToken();
    expect((await invite(adminA, 'team-db-4', token)).error).toBeNull();
    expect((await invitee.rpc('accept_organization_invitation', [hash(token)])).error).toBeNull();
    expect((await invitee.rpc('current_account_is_active')).data?.[0]?.current_account_is_active).toBe(true);
  });

  it('gives the runtime role no access to removal records', async () => {
    expect((await adminA.from('organization_member_removals').select('user_id')).error).not.toBeNull();
  });
});
