import { describe, expect, it } from 'vitest';
import {
  buildTeamInvitationUrl,
  generateInvitationToken,
  hashInvitationToken,
  isTeamRole,
  isWellFormedInvitationToken,
  remainingTeamSeats,
  teamInvitationExpiry,
  TEAM_INVITATION_TTL_DAYS,
} from '@/lib/team/invitation';
import { createTeamInvitationSchema, registerInvitedMemberSchema, acceptTeamInvitationSchema } from '@/lib/validation/team.schemas';

describe('Invitation de collaborateur — jeton et lien', () => {
  it('produit un jeton bien formé dont seule l’empreinte hexadécimale est stockable', () => {
    const token = generateInvitationToken();
    expect(isWellFormedInvitationToken(token)).toBe(true);
    expect(hashInvitationToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInvitationToken(token)).not.toContain(token);
    expect(generateInvitationToken()).not.toBe(token);
  });

  it('construit le lien sur la page publique d’équipe', () => {
    const url = new URL(buildTeamInvitationUrl('https://monservicecrm.netlify.app', 'abc'));
    expect(url.pathname).toBe('/invitation/equipe');
    expect(url.searchParams.get('token')).toBe('abc');
  });

  it('expire après la durée prévue', () => {
    const now = new Date('2026-11-17T10:00:00Z');
    expect(teamInvitationExpiry(now).getTime() - now.getTime()).toBe(TEAM_INVITATION_TTL_DAYS * 86400000);
  });
});

describe('Places de l’équipe', () => {
  it('compte membres et invitations en attente, sans descendre sous zéro', () => {
    expect(remainingTeamSeats(5, 2, 1)).toBe(2);
    expect(remainingTeamSeats(1, 1, 0)).toBe(0);
    expect(remainingTeamSeats(1, 1, 2)).toBe(0);
    expect(remainingTeamSeats(null, 40, 10)).toBeNull();
  });

  it('ne reconnaît que les rôles admin et membre', () => {
    expect(isTeamRole('admin')).toBe(true);
    expect(isTeamRole('member')).toBe(true);
    expect(isTeamRole('owner')).toBe(false);
    expect(isTeamRole(null)).toBe(false);
  });
});

describe('Validation des entrées d’équipe', () => {
  it('normalise l’adresse invitée et refuse un rôle ou un champ inconnu', () => {
    expect(createTeamInvitationSchema.parse({ email: '  Jean@Exemple.FR ' })).toEqual({ email: 'jean@exemple.fr', role: 'member' });
    expect(createTeamInvitationSchema.safeParse({ email: 'jean@exemple.fr', role: 'owner' }).success).toBe(false);
    expect(createTeamInvitationSchema.safeParse({ email: 'jean@exemple.fr', organizationId: 'autre' }).success).toBe(false);
    expect(createTeamInvitationSchema.safeParse({ email: 'pas-une-adresse' }).success).toBe(false);
  });

  it('exige un jeton bien formé pour l’inscription sur invitation et accepte l’absence de jeton à l’acceptation', () => {
    const token = generateInvitationToken();
    const valid = { token, name: 'Jean', email: 'jean@exemple.fr', password: 'Motdepasse1!' };
    expect(registerInvitedMemberSchema.safeParse(valid).success).toBe(true);
    expect(registerInvitedMemberSchema.safeParse({ ...valid, token: 'court' }).success).toBe(false);
    expect(registerInvitedMemberSchema.safeParse({ ...valid, profileType: 'client' }).success).toBe(false);
    expect(acceptTeamInvitationSchema.parse({})).toEqual({ token: null });
    expect(acceptTeamInvitationSchema.safeParse({ token: 'x' }).success).toBe(false);
  });
});
