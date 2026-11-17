'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  createTeamInvitationAction,
  removeTeamMemberAction,
  revokeTeamInvitationAction,
  setTeamMemberRoleAction,
} from '@/app/actions/team.actions';
import type { TeamOverview } from '@/lib/services/team.service';
import { TEAM_ROLE_LABELS, type TeamRole } from '@/lib/team/invitation';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date);
}

const button = 'rounded-md px-3 py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50';

export default function TeamManager({ overview }: { overview: TeamOverview }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('member');
  const [lastLink, setLastLink] = useState<{ url: string; email: string; emailSent: boolean } | null>(null);
  const [confirmRemoval, setConfirmRemoval] = useState<string | null>(null);

  const run = (task: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const result = await task();
      if (result.ok) {
        toast.success(success);
        router.refresh();
      } else {
        toast.error(result.error ?? 'Action impossible.');
      }
    });

  const invite = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await createTeamInvitationAction({ email, role });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setLastLink(result.data);
      setEmail('');
      setRole('member');
      toast.success(result.data.emailSent ? 'Invitation envoyée.' : 'Invitation créée. Transmettez le lien ci-dessous.');
      router.refresh();
    });
  };

  const seatsText =
    overview.seatLimit === null
      ? 'Utilisateurs illimités avec votre offre.'
      : `${overview.members.length} utilisateur${overview.members.length > 1 ? 's' : ''} sur ${overview.seatLimit} inclus dans votre offre.`;

  return (
    <div className="space-y-6" data-testid="team-manager">
      <section className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Membres de l’équipe</h2>
            <p className="mt-1 text-sm text-gray-500">{seatsText} Les membres accèdent aux clients, devis, factures et interventions de l’organisation ; les administrateurs gèrent en plus l’équipe.</p>
          </div>
          <ul className="divide-y divide-gray-100" data-testid="team-members">
            {overview.members.map((member) => (
              <li key={member.userId} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" data-testid="team-member">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {member.name || member.email}
                    {member.isCurrent && <span className="ml-2 text-xs text-gray-500">(vous)</span>}
                  </p>
                  <p className="text-sm text-gray-600">{member.email} · {TEAM_ROLE_LABELS[member.role]}</p>
                </div>
                {overview.isAdmin && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => setTeamMemberRoleAction({ userId: member.userId, role: member.role === 'admin' ? 'member' : 'admin' }), 'Rôle mis à jour.')}
                      className={`${button} border border-gray-300 text-gray-700 hover:bg-gray-50`}
                    >
                      {member.role === 'admin' ? 'Retirer le rôle administrateur' : 'Nommer administrateur'}
                    </button>
                    {!member.isCurrent && (confirmRemoval === member.userId ? (
                      <>
                        <button type="button" disabled={pending} onClick={() => { setConfirmRemoval(null); run(() => removeTeamMemberAction({ userId: member.userId }), 'Accès retiré.'); }} className={`${button} bg-red-600 text-white hover:bg-red-700`} data-testid="team-member-remove-confirm">
                          Confirmer le retrait
                        </button>
                        <button type="button" onClick={() => setConfirmRemoval(null)} className={`${button} text-gray-600 hover:bg-gray-50`}>Annuler</button>
                      </>
                    ) : (
                      <button type="button" disabled={pending} onClick={() => setConfirmRemoval(member.userId)} className={`${button} border border-red-200 text-red-700 hover:bg-red-50`} data-testid="team-member-remove">
                        Retirer de l’équipe
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {overview.isAdmin ? (
        <section className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Inviter un collaborateur</h2>
            {overview.remainingSeats === 0 ? (
              <p className="text-sm text-gray-600" data-testid="team-limit-reached">Toutes les places de votre offre sont utilisées. Retirez un membre ou une invitation en attente pour en inviter un autre.</p>
            ) : (
              <form onSubmit={invite} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                <div>
                  <label htmlFor="team-invite-email" className="block text-sm font-medium text-gray-700 mb-1">Adresse e-mail</label>
                  <input id="team-invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="collegue@entreprise.fr" />
                </div>
                <div>
                  <label htmlFor="team-invite-role" className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                  <select id="team-invite-role" value={role} onChange={(e) => setRole(e.target.value === 'admin' ? 'admin' : 'member')} className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    <option value="member">{TEAM_ROLE_LABELS.member}</option>
                    <option value="admin">{TEAM_ROLE_LABELS.admin}</option>
                  </select>
                </div>
                <button type="submit" disabled={pending} className={`${button} bg-indigo-600 text-white hover:bg-indigo-700 py-2`} data-testid="team-invite-submit">
                  Inviter
                </button>
              </form>
            )}
            {lastLink && (
              <div className="rounded-md border border-indigo-100 bg-indigo-50 p-3 text-sm space-y-2" data-testid="team-invite-link">
                <p className="text-indigo-900">
                  {lastLink.emailSent ? `Invitation envoyée à ${lastLink.email}.` : `L’e-mail n’a pas pu partir : transmettez ce lien à ${lastLink.email}.`} Il ne fonctionne qu’avec cette adresse et une seule fois.
                </p>
                <div className="flex gap-2">
                  <input readOnly value={lastLink.url} className="flex-1 rounded border border-indigo-200 bg-white px-2 py-1 text-xs" aria-label="Lien d’invitation" data-testid="team-invite-url" />
                  <button type="button" onClick={() => navigator.clipboard?.writeText(lastLink.url).then(() => toast.success('Lien copié.'))} className={`${button} border border-indigo-200 text-indigo-700 hover:bg-white`}>Copier</button>
                </div>
              </div>
            )}

            {overview.invitations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Invitations en attente</h3>
                <ul className="divide-y divide-gray-100" data-testid="team-invitations">
                  {overview.invitations.map((invitation) => (
                    <li key={invitation.id} className="py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" data-testid="team-invitation-row">
                      <p className="text-sm text-gray-700">
                        {invitation.email} · {TEAM_ROLE_LABELS[invitation.role]} ·{' '}
                        {invitation.expired ? <span className="text-red-700">expirée</span> : `valable jusqu’au ${formatDate(invitation.expiresAt)}`}
                      </p>
                      <button type="button" disabled={pending} onClick={() => run(() => revokeTeamInvitationAction({ invitationId: invitation.id }), 'Invitation retirée.')} className={`${button} border border-gray-300 text-gray-700 hover:bg-gray-50`}>
                        Retirer l’invitation
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      ) : (
        <p className="text-sm text-gray-500">Seuls les administrateurs de l’organisation peuvent inviter ou retirer des membres.</p>
      )}
    </div>
  );
}
