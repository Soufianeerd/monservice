import 'server-only';
import { and, count, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { organizationInvitations, organizations, users } from '@/lib/db/schema';
import { AppError } from '@/lib/errors';
import { generateId } from '@/lib/utils/id-generator';
import { sendEmail } from '@/lib/email';
import { teamInvitationTemplate } from '@/lib/email/templates';
import { getUserPlan } from '@/lib/billing/quota';
import {
  buildTeamInvitationUrl,
  generateInvitationToken,
  hashInvitationToken,
  isTeamRole,
  normalizeInvitationEmail,
  remainingTeamSeats,
  teamInvitationExpiry,
  TEAM_ROLE_LABELS,
  type TeamRole,
} from '@/lib/team/invitation';

// Équipe d'une organisation (migration 0019). La base est l'autorité : RLS
// réservée aux administrateurs sur les invitations, rattachement et retrait
// uniquement par les fonctions SECURITY DEFINER bornées.

export type TeamMember = {
  userId: string;
  name: string | null;
  email: string;
  role: TeamRole;
  joinedAt: string;
  isCurrent: boolean;
};

export type PendingTeamInvitation = {
  id: string;
  email: string;
  role: TeamRole;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
};

export type TeamOverview = {
  isAdmin: boolean;
  members: TeamMember[];
  invitations: PendingTeamInvitation[];
  seatLimit: number | null;
  remainingSeats: number | null;
};

export type CreatedTeamInvitation = { url: string; email: string; expiresAt: string; emailSent: boolean };

export type TeamInvitationPreview = {
  organizationName: string;
  email: string;
  role: TeamRole;
  state: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
};

function postgresMessage(err: unknown): string {
  if (typeof err !== 'object' || err === null) return '';
  const own = 'message' in err && typeof err.message === 'string' ? err.message : '';
  const cause = 'cause' in err ? postgresMessage(err.cause) : '';
  return `${own} ${cause}`;
}

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return typeof value === 'string' ? value : '';
}

/** Traduit les refus SQL bornés en messages pour l'utilisateur. */
function translate(err: unknown): never {
  if (err instanceof AppError) throw err;
  const message = postgresMessage(err);
  const known: Array<[string, AppError]> = [
    ['Organization administrator required', new AppError('Seul un administrateur de l’organisation peut gérer l’équipe.', 403, 'TEAM_ADMIN_REQUIRED')],
    ['Last organization administrator', new AppError('L’organisation doit garder au moins un administrateur.', 409, 'TEAM_LAST_ADMIN')],
    ['Administrators cannot remove themselves', new AppError('Vous ne pouvez pas vous retirer vous-même de l’équipe.', 409, 'TEAM_SELF_REMOVAL')],
    ['Member not found', new AppError('Ce membre n’appartient pas à votre équipe.', 404, 'TEAM_MEMBER_NOT_FOUND')],
    ['Invitation email mismatch', new AppError('Cette invitation a été envoyée à une autre adresse e-mail. Connectez-vous avec le compte de l’adresse invitée.', 403, 'INVITATION_EMAIL_MISMATCH')],
    ['Invitation unavailable', new AppError('Cette invitation a expiré, a été retirée ou a déjà été utilisée. Demandez un nouveau lien.', 410, 'INVITATION_UNAVAILABLE')],
    ['Verified email required', new AppError('Confirmez d’abord votre adresse e-mail.', 403, 'EMAIL_NOT_VERIFIED')],
    ['Account already belongs to an organization', new AppError('Ce compte appartient déjà à une organisation. Utilisez une autre adresse e-mail pour rejoindre cette équipe.', 409, 'ACCOUNT_HAS_ORGANIZATION')],
    ['A professional account is required', new AppError('Un compte professionnel est nécessaire.', 403, 'PROFESSIONAL_ACCOUNT_REQUIRED')],
    ['organization_invitations_pending_unique', new AppError('Une invitation est déjà en attente pour cette adresse.', 409, 'INVITATION_ALREADY_PENDING')],
    ['Invalid workspace', new AppError('Renseignez un nom d’entreprise et un secteur valides.', 400, 'INVALID_WORKSPACE')],
  ];
  for (const [needle, appError] of known) if (message.includes(needle)) throw appError;
  throw err;
}

export async function isCurrentUserTeamAdmin(): Promise<boolean> {
  const rows = await db.execute(sql`select public.current_user_is_organization_admin() as admin`);
  return rows[0]?.admin === true;
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  const rows = await db.execute(sql`select * from public.list_organization_members()`);
  return rows.map((row) => ({
    userId: String(row.user_id),
    name: row.name == null ? null : String(row.name),
    email: String(row.email),
    role: isTeamRole(row.role) ? row.role : 'member',
    joinedAt: String(row.joined_at ?? ''),
    isCurrent: row.is_current === true,
  }));
}

function pendingCondition(organizationId: string) {
  return and(
    eq(organizationInvitations.organizationId, organizationId),
    isNull(organizationInvitations.acceptedAt),
    isNull(organizationInvitations.revokedAt),
  );
}

async function listPendingInvitations(organizationId: string): Promise<PendingTeamInvitation[]> {
  const rows = await db
    .select({
      id: organizationInvitations.id,
      email: organizationInvitations.email,
      role: organizationInvitations.role,
      createdAt: organizationInvitations.createdAt,
      expiresAt: organizationInvitations.expiresAt,
    })
    .from(organizationInvitations)
    .where(pendingCondition(organizationId))
    .orderBy(organizationInvitations.createdAt);
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: isTeamRole(row.role) ? row.role : 'member',
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    expired: row.expiresAt.getTime() <= Date.now(),
  }));
}

async function countActivePendingInvitations(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(organizationInvitations)
    .where(and(pendingCondition(organizationId), gt(organizationInvitations.expiresAt, new Date())));
  return Number(row?.n ?? 0);
}

export async function getTeamOverview(organizationId: string, userId: string): Promise<TeamOverview> {
  const [isAdmin, members, plan] = await Promise.all([isCurrentUserTeamAdmin(), listTeamMembers(), getUserPlan(userId)]);
  const invitations = isAdmin ? await listPendingInvitations(organizationId) : [];
  const activePending = invitations.filter((invitation) => !invitation.expired).length;
  const seatLimit = plan.limits.teamMembers;
  return { isAdmin, members, invitations, seatLimit, remainingSeats: remainingTeamSeats(seatLimit, members.length, activePending) };
}

export async function createTeamInvitation(
  ctx: { organizationId: string; userId: string },
  input: { email: string; role: TeamRole },
  appBaseUrl: string,
): Promise<CreatedTeamInvitation> {
  if (!(await isCurrentUserTeamAdmin())) {
    throw new AppError('Seul un administrateur de l’organisation peut inviter un collaborateur.', 403, 'TEAM_ADMIN_REQUIRED');
  }
  const email = normalizeInvitationEmail(input.email);
  const [members, plan, pending] = await Promise.all([
    listTeamMembers(),
    getUserPlan(ctx.userId),
    countActivePendingInvitations(ctx.organizationId),
  ]);
  if (members.some((member) => member.email.toLowerCase() === email)) {
    throw new AppError('Cette personne fait déjà partie de votre équipe.', 409, 'TEAM_ALREADY_MEMBER');
  }
  const remaining = remainingTeamSeats(plan.limits.teamMembers, members.length, pending);
  if (remaining !== null && remaining <= 0) {
    throw new AppError(
      `Votre offre permet ${plan.limits.teamMembers} utilisateur${plan.limits.teamMembers === 1 ? '' : 's'}. Retirez un membre ou une invitation en attente pour en inviter un autre.`,
      403,
      'TEAM_LIMIT_REACHED',
    );
  }

  const token = generateInvitationToken();
  const expiresAt = teamInvitationExpiry();
  try {
    await db.transaction(async (tx) => {
      // Une invitation expirée encore « en attente » bloquerait l'index
      // d'unicité : on la retire avant d'en créer une nouvelle.
      await tx
        .update(organizationInvitations)
        .set({ revokedAt: new Date() })
        .where(and(pendingCondition(ctx.organizationId), eq(organizationInvitations.email, email), sql`${organizationInvitations.expiresAt} <= now()`));
      await tx.insert(organizationInvitations).values({
        id: generateId(),
        organizationId: ctx.organizationId,
        email,
        role: input.role,
        tokenHash: hashInvitationToken(token),
        // Imposés de toute façon par le trigger (auteur, horodatage).
        createdByUserId: sql`public.current_app_user_id()`,
        expiresAt,
      });
    });
  } catch (err) {
    translate(err);
  }

  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, ctx.organizationId)).limit(1);
  const [inviter] = await db.select({ name: users.name }).from(users).where(eq(users.id, ctx.userId)).limit(1);
  const url = buildTeamInvitationUrl(appBaseUrl, token);
  const template = teamInvitationTemplate({
    organizationName: org?.name ?? 'Votre équipe',
    inviterName: inviter?.name ?? 'Un administrateur',
    roleLabel: TEAM_ROLE_LABELS[input.role],
    url,
    expiresAt: expiresAt.toISOString(),
  });
  const result = await sendEmail({ to: email, subject: template.subject, html: template.html, tag: 'team.invitation' });
  return { url, email, expiresAt: expiresAt.toISOString(), emailSent: result.sent };
}

export async function revokeTeamInvitation(organizationId: string, invitationId: string): Promise<boolean> {
  try {
    const rows = await db
      .update(organizationInvitations)
      .set({ revokedAt: new Date() })
      .where(and(pendingCondition(organizationId), eq(organizationInvitations.id, invitationId)))
      .returning({ id: organizationInvitations.id });
    return rows.length > 0;
  } catch (err) {
    translate(err);
  }
}

export async function setTeamMemberRole(userId: string, role: TeamRole): Promise<void> {
  try {
    await db.execute(sql`select public.set_organization_member_role(${userId}, ${role})`);
  } catch (err) {
    translate(err);
  }
}

export async function removeTeamMember(userId: string): Promise<void> {
  try {
    await db.execute(sql`select public.remove_organization_member(${userId})`);
  } catch (err) {
    translate(err);
  }
}

export async function previewTeamInvitation(token: string): Promise<TeamInvitationPreview | null> {
  const rows = await db.execute(sql`select * from public.preview_organization_invitation(${hashInvitationToken(token)})`);
  const row = rows[0];
  if (!row) return null;
  const state = String(row.state);
  return {
    organizationName: String(row.organization_name ?? ''),
    email: String(row.email ?? ''),
    role: isTeamRole(row.role) ? row.role : 'member',
    state: state === 'pending' || state === 'accepted' || state === 'expired' ? state : 'revoked',
    expiresAt: asIso(row.expires_at),
  };
}

/** Invitation en attente adressée au compte connecté, sans jeton. */
export async function currentPendingTeamInvitation(): Promise<{ organizationName: string; role: TeamRole } | null> {
  const rows = await db.execute(sql`select * from public.current_pending_organization_invitation()`);
  const row = rows[0];
  if (!row) return null;
  return { organizationName: String(row.organization_name ?? ''), role: isTeamRole(row.role) ? row.role : 'member' };
}

/** Organisation dont le compte connecté a été retiré, le cas échéant. */
export async function currentTeamRemoval(): Promise<{ organizationName: string } | null> {
  const rows = await db.execute(sql`select * from public.current_organization_removal()`);
  const row = rows[0];
  return row ? { organizationName: String(row.organization_name ?? '') } : null;
}

export async function acceptTeamInvitation(token: string | null): Promise<string> {
  try {
    const hash = token ? hashInvitationToken(token) : null;
    const rows = await db.execute(sql`select public.accept_organization_invitation(${hash}) as organization_id`);
    const organizationId = rows[0]?.organization_id;
    if (typeof organizationId !== 'string') throw new AppError('Invitation indisponible', 404, 'INVITATION_UNAVAILABLE');
    return organizationId;
  } catch (err) {
    translate(err);
  }
}

export async function createOwnWorkspace(input: { orgName: string; sector: string; profession?: string }): Promise<string> {
  try {
    const rows = await db.execute(sql`select public.create_current_workspace(${input.orgName}, ${input.sector}, ${input.profession ?? null}) as organization_id`);
    return String(rows[0]?.organization_id);
  } catch (err) {
    translate(err);
  }
}
