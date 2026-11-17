import { test, expect } from '@playwright/test';

// Le panneau d'aide contextuelle s'ouvre par défaut en bas à droite et
// recouvre les boutons de formulaire alignés à droite (constaté en CI sur
// « Envoyer l'invitation ») : on le ferme comme le ferait l'utilisateur.
const closeContextualHelp = () => window.localStorage.setItem('monservice_contextual_help', 'off');
import postgres from 'postgres';
import { signInFixture } from './helpers/sign-in-fixture';

// Équipe (0019) : un administrateur invite un collaborateur depuis
// Paramètres > Équipe, le collaborateur rejoint par le lien, puis
// l'administrateur retire son accès.
const adminEmail = 'pro_generic_a@monservice.invalid';
const inviteeEmail = 'pro_team_e2e@monservice.invalid';
const orgA = 'org-generic-a-1234';

test.describe('Équipe — invitation, rattachement et retrait', () => {
  test.describe.configure({ mode: 'serial' });
  let sql: postgres.Sql;

  const reset = async () => {
    await sql`delete from organization_invitations where email = ${inviteeEmail}`;
    await sql`delete from organization_member_removals where user_id in (select id from users where email = ${inviteeEmail})`;
    await sql`delete from user_roles where organization_id = ${orgA} and role_id = 'role-org-admin'`;
    await sql`update users set organization_id = null where email = ${inviteeEmail}`;
  };

  test.beforeAll(async () => {
    sql = postgres(process.env.NEON_ADMIN_DATABASE_URL ?? process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
    // Le fournisseur synthétique ne vérifie pas les adresses ; la production, si.
    await sql`update neon_auth."user" set "emailVerified" = true where email = ${inviteeEmail}`;
    await reset();
  });

  test.afterAll(async () => {
    await reset();
    await sql.end();
  });

  test('un collaborateur invité rejoint l’équipe puis perd l’accès quand il est retiré', async ({ browser }) => {
    const adminContext = await browser.newContext();
    await adminContext.addInitScript(closeContextualHelp);
    const admin = await adminContext.newPage();
    await signInFixture(admin, adminEmail, /\/dashboard/);
    await admin.goto('/parametres/equipe');
    await expect(admin.getByTestId('team-manager')).toBeVisible();
    await admin.getByLabel('Adresse e-mail').fill(inviteeEmail);
    await admin.getByTestId('team-invite-submit').click();
    const linkField = admin.getByTestId('team-invite-url');
    await expect(linkField).toBeVisible();
    const link = await linkField.inputValue();
    expect(link).toContain('/invitation/equipe?token=');
    await expect(admin.getByTestId('team-invitation-row')).toContainText(inviteeEmail);

    // Sans session : la page présente l'invitation sans rien rattacher.
    const anonymousContext = await browser.newContext();
    await anonymousContext.addInitScript(closeContextualHelp);
    const anonymous = await anonymousContext.newPage();
    await anonymous.goto(new URL(link).pathname + new URL(link).search);
    await expect(anonymous.getByTestId('team-invitation')).toContainText(inviteeEmail);
    await expect(anonymous.getByRole('link', { name: 'Créer mon compte' })).toBeVisible();
    await anonymousContext.close();

    const inviteeContext = await browser.newContext();
    await inviteeContext.addInitScript(closeContextualHelp);
    const invitee = await inviteeContext.newPage();
    await signInFixture(invitee, inviteeEmail, /\/complete-profile/);
    await invitee.goto(new URL(link).pathname + new URL(link).search);
    await invitee.getByTestId('team-invitation-accept').click();
    await invitee.waitForURL(/\/dashboard/);
    const [joined] = await sql`select organization_id from users where email = ${inviteeEmail}`;
    expect(joined.organization_id).toBe(orgA);

    // Un membre voit l'équipe mais ne la gère pas.
    await invitee.goto('/parametres/equipe');
    await expect(invitee.getByTestId('team-members')).toContainText(adminEmail);
    await expect(invitee.getByTestId('team-invite-submit')).toHaveCount(0);
    await expect(invitee.getByTestId('team-member-remove')).toHaveCount(0);

    await admin.reload();
    const row = admin.getByTestId('team-member').filter({ hasText: inviteeEmail });
    await expect(row).toBeVisible();
    await row.getByTestId('team-member-remove').click();
    await row.getByTestId('team-member-remove-confirm').click();
    await expect(admin.getByTestId('team-member').filter({ hasText: inviteeEmail })).toHaveCount(0);

    await invitee.goto('/dashboard');
    await invitee.waitForURL(/\/complete-profile/);
    await expect(invitee.getByTestId('team-removed')).toBeVisible();

    await inviteeContext.close();
    await adminContext.close();
  });
});
