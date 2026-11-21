import {
  generateInvitationToken,
  hashInvitationToken,
  isWellFormedInvitationToken,
  normalizeInvitationEmail,
} from '@/lib/client-portal/invitation-token';

// Invitation d'un collaborateur (migration 0019). Même format de jeton que
// l'invitation au portail : 32 octets aléatoires en base64url, seule
// l'empreinte SHA-256 est stockée.
export { generateInvitationToken, hashInvitationToken, isWellFormedInvitationToken, normalizeInvitationEmail };

export const TEAM_INVITATION_TTL_DAYS = 7;
export const TEAM_ROLES = ['admin', 'member'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  admin: 'Administrateur',
  member: 'Membre',
};

export function isTeamRole(value: unknown): value is TeamRole {
  return value === 'admin' || value === 'member';
}

export function teamInvitationExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + TEAM_INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function buildTeamInvitationUrl(base: string, token: string): string {
  const url = new URL('/invitation/equipe', base);
  url.searchParams.set('token', token);
  return url.toString();
}

/**
 * Places restantes dans l'équipe : membres actifs et invitations en attente
 * comptent tous deux. `null` = illimité.
 */
export function remainingTeamSeats(limit: number | null, activeMembers: number, pendingInvitations: number): number | null {
  if (limit === null) return null;
  return Math.max(0, limit - activeMembers - pendingInvitations);
}
