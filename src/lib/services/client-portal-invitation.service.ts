import 'server-only';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { clientPortalInvitations, clients, organizations } from '@/lib/db/schema';
import { AppError } from '@/lib/errors';
import { generateId } from '@/lib/utils/id-generator';
import { sendEmail } from '@/lib/email';
import { clientPortalInvitationTemplate } from '@/lib/email/templates';
import {
  buildInvitationUrl,
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiry,
  normalizeInvitationEmail,
} from '@/lib/client-portal/invitation-token';

// Invitation d'un client au portail (migration 0017). La base est l'autorité :
// RLS professionnelle sur les invitations, liaison de la fiche uniquement via
// accept_client_portal_invitation (e-mail du compte = e-mail invité).

export type ClientPortalStatus = {
  linked: boolean;
  linkedEmail: string | null;
  pending: { email: string; createdAt: string; expiresAt: string; expired: boolean } | null;
};

export type CreatedClientPortalInvitation = {
  url: string;
  email: string;
  expiresAt: string;
  emailSent: boolean;
};

export type InvitationPreview = {
  organizationName: string;
  state: 'pending' | 'accepted' | 'expired' | 'revoked' | 'unavailable';
  emailMatches: boolean;
};

function postgresMessage(err: unknown): string {
  if (typeof err !== 'object' || err === null) return '';
  const own = 'message' in err && typeof err.message === 'string' ? err.message : '';
  const cause = 'cause' in err ? postgresMessage(err.cause) : '';
  return `${own} ${cause}`;
}

async function getOwnClient(organizationId: string, clientId: string) {
  const [client] = await db
    .select({ id: clients.id, name: clients.name, email: clients.email, contactEmail: clients.contactEmail, userId: clients.userId })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.organizationId, organizationId)))
    .limit(1);
  if (!client) throw new AppError('Client introuvable dans cette organisation', 404, 'CLIENT_NOT_FOUND');
  return client;
}

function pendingCondition(organizationId: string, clientId: string) {
  return and(
    eq(clientPortalInvitations.organizationId, organizationId),
    eq(clientPortalInvitations.clientId, clientId),
    isNull(clientPortalInvitations.acceptedAt),
    isNull(clientPortalInvitations.revokedAt),
  );
}

export async function getClientPortalStatus(organizationId: string, clientId: string): Promise<ClientPortalStatus> {
  const client = await getOwnClient(organizationId, clientId);
  const [pending] = await db
    .select({ email: clientPortalInvitations.email, createdAt: clientPortalInvitations.createdAt, expiresAt: clientPortalInvitations.expiresAt })
    .from(clientPortalInvitations)
    .where(pendingCondition(organizationId, clientId))
    .limit(1);
  let linkedEmail: string | null = null;
  if (client.userId) {
    const [accepted] = await db
      .select({ email: clientPortalInvitations.email })
      .from(clientPortalInvitations)
      .where(and(
        eq(clientPortalInvitations.organizationId, organizationId),
        eq(clientPortalInvitations.clientId, clientId),
        eq(clientPortalInvitations.acceptedByUserId, client.userId),
      ))
      .orderBy(desc(clientPortalInvitations.acceptedAt))
      .limit(1);
    linkedEmail = accepted?.email ?? null;
  }
  return {
    linked: Boolean(client.userId),
    linkedEmail,
    pending: pending
      ? {
          email: pending.email,
          createdAt: pending.createdAt.toISOString(),
          expiresAt: pending.expiresAt.toISOString(),
          expired: pending.expiresAt.getTime() <= Date.now(),
        }
      : null,
  };
}

export async function createClientPortalInvitation(
  organizationId: string,
  input: { clientId: string; email?: string },
  appBaseUrl: string,
): Promise<CreatedClientPortalInvitation> {
  const client = await getOwnClient(organizationId, input.clientId);
  if (client.userId) {
    throw new AppError('Ce client a déjà accès à son espace. Retirez l’accès avant d’inviter un autre compte.', 409, 'CLIENT_ALREADY_LINKED');
  }
  const rawEmail = input.email ?? client.email ?? client.contactEmail ?? '';
  const email = normalizeInvitationEmail(rawEmail);
  if (!email) throw new AppError('Renseignez l’adresse e-mail du client pour l’inviter.', 400, 'CLIENT_EMAIL_REQUIRED');

  const token = generateInvitationToken();
  const expiresAt = invitationExpiry();
  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);

  await db.transaction(async (tx) => {
    // Une seule invitation en attente par fiche : la précédente est révoquée.
    await tx.update(clientPortalInvitations).set({ revokedAt: new Date() }).where(pendingCondition(organizationId, client.id));
    await tx.insert(clientPortalInvitations).values({
      id: generateId(),
      organizationId,
      clientId: client.id,
      email,
      tokenHash: hashInvitationToken(token),
      // Valeurs imposées de toute façon par le trigger (auteur, horodatage).
      createdByUserId: sql`public.current_app_user_id()`,
      expiresAt,
    });
  });

  const url = buildInvitationUrl(appBaseUrl, token);
  const template = clientPortalInvitationTemplate({
    clientName: client.name,
    organizationName: org?.name ?? 'Votre prestataire',
    url,
    expiresAt: expiresAt.toISOString(),
  });
  const result = await sendEmail({ to: email, subject: template.subject, html: template.html, tag: 'client_portal.invitation' });
  return { url, email, expiresAt: expiresAt.toISOString(), emailSent: result.sent };
}

export async function revokeClientPortalInvitation(organizationId: string, clientId: string): Promise<boolean> {
  await getOwnClient(organizationId, clientId);
  const rows = await db
    .update(clientPortalInvitations)
    .set({ revokedAt: new Date() })
    .where(pendingCondition(organizationId, clientId))
    .returning({ id: clientPortalInvitations.id });
  return rows.length > 0;
}

export async function unlinkClientPortalAccount(organizationId: string, clientId: string): Promise<boolean> {
  await getOwnClient(organizationId, clientId);
  const rows = await db.execute(sql`select public.unlink_client_portal_account(${clientId}) as unlinked`);
  return rows[0]?.unlinked === true;
}

export async function previewClientPortalInvitation(token: string): Promise<InvitationPreview | null> {
  const rows = await db.execute(sql`select * from public.preview_client_portal_invitation(${hashInvitationToken(token)})`);
  const row = rows[0];
  if (!row) return null;
  const state = String(row.state);
  return {
    organizationName: String(row.organization_name ?? ''),
    state: state === 'pending' || state === 'accepted' || state === 'expired' || state === 'revoked' ? state : 'unavailable',
    emailMatches: row.email_matches === true,
  };
}

export async function acceptClientPortalInvitation(token: string): Promise<{ clientId: string; organizationId: string }> {
  try {
    const rows = await db.execute(sql`select * from public.accept_client_portal_invitation(${hashInvitationToken(token)})`);
    const row = rows[0];
    if (!row) throw new AppError('Invitation indisponible', 404, 'INVITATION_UNAVAILABLE');
    return { clientId: String(row.client_id), organizationId: String(row.organization_id) };
  } catch (err) {
    if (err instanceof AppError) throw err;
    const message = postgresMessage(err);
    if (message.includes('Invitation email mismatch')) {
      throw new AppError('Cette invitation a été envoyée à une autre adresse e-mail. Connectez-vous avec le compte de l’adresse invitée.', 403, 'INVITATION_EMAIL_MISMATCH');
    }
    if (message.includes('Client record already linked')) {
      throw new AppError('Cet espace client est déjà relié à un autre compte.', 409, 'CLIENT_ALREADY_LINKED');
    }
    if (message.includes('Invitation unavailable')) {
      throw new AppError('Cette invitation a expiré, a été retirée ou a déjà été utilisée. Demandez un nouveau lien à votre prestataire.', 410, 'INVITATION_UNAVAILABLE');
    }
    if (message.includes('A client account is required')) {
      throw new AppError('Seul un compte client peut accepter cette invitation.', 403, 'CLIENT_ACCOUNT_REQUIRED');
    }
    throw err;
  }
}
