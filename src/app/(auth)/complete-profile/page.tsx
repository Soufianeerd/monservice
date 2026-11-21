'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { completeProfileAction, getAccountRecoveryAction } from '@/app/actions/auth';
import { acceptTeamInvitationAction } from '@/app/actions/team.actions';
import { authClient } from '@/lib/auth/client';
import { openRegistrationSectorCodes, REGISTRATION_SECTORS } from '@/lib/registration/options';
import { PARAMEDICAL_PROFESSION_CODES, PARAMEDICAL_PROFESSIONS } from '@/lib/workspaces/paramedical/professions';
import { FIELD_SERVICE_PROFESSION_CODES, FIELD_SERVICE_PROFESSIONS } from '@/lib/workspaces/field-service/professions';

type Recovery = NonNullable<Awaited<ReturnType<typeof getAccountRecoveryAction>>>;
export default function CompleteProfilePage() {
  const [account,setAccount] = useState<Recovery | null>(null);
  const [loading,setLoading] = useState(true);
  const [profileType,setProfileType] = useState<'client' | 'professional'>('professional');
  const [joining,setJoining] = useState(false);
  const [orgName,setOrgName] = useState('');
  const [sector,setSector] = useState('other');
  const [profession,setProfession] = useState('');
  const [message,setMessage] = useState('');
  useEffect(()=> { getAccountRecoveryAction().then(value=> {
    setAccount(value); setLoading(false);
    if (value?.profileType === 'professional' || !value?.clientRegistrationOpen) setProfileType('professional');
    if (value?.hasProfile && !value.needsWorkspace) window.location.href=value.profileType === 'client' ? '/client/dashboard' : '/dashboard';
  }).catch(()=>{ setLoading(false); setMessage('Chargement indisponible. Réessayez.'); }); },[]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setMessage('');
    try {
      const result = await completeProfileAction({ profileType, ...(profileType === 'professional' ? { orgName,sector,...(profession ? { profession } : {}) } : {}) });
      window.location.href = result.destination;
    } catch { setMessage('Impossible de finaliser votre espace. Vérifiez les champs et votre adresse email.'); setLoading(false); }
  };
  const join = async () => {
    setJoining(true); setMessage('');
    const result = await acceptTeamInvitationAction({ token: null });
    if (result.ok) { window.location.href = result.data.destination; return; }
    setMessage(result.error); setJoining(false);
  };
  const signOut = async () => { try { await authClient.signOut(); } finally { window.location.href = '/login'; } };
  if (loading) return <p className="p-6">Chargement…</p>;
  if (!account) return <div className="p-6"><p>{message || 'Connectez-vous pour continuer.'}</p><Link href="/login">Se connecter</Link></div>;
  if (!account.emailVerified) return <div className="p-6"><p>Confirmez votre adresse email pour récupérer votre compte.</p><Link href={`/verify-email?email=${encodeURIComponent(account.email)}`}>Confirmer mon adresse</Link></div>;
  if (account.removedFrom) return <div className="max-w-lg mx-auto p-6 space-y-4" data-testid="team-removed">
    <h1 className="text-xl font-bold">Accès retiré</h1>
    <p>Un administrateur de {account.removedFrom} a retiré votre accès à son espace MonService. Contactez-le si vous devez y revenir : il pourra vous inviter à nouveau.</p>
    <button type="button" onClick={signOut} className="bg-primary-600 text-white p-2 rounded">Se déconnecter</button>
  </div>;
  return <div className="max-w-lg mx-auto p-6 space-y-4"><h1 className="text-xl font-bold">Finaliser votre espace</h1>
    {account.pendingInvitation && <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-3" data-testid="team-invitation-pending">
      <p><strong>{account.pendingInvitation.organizationName}</strong> vous invite à rejoindre son équipe ({account.pendingInvitation.roleLabel.toLowerCase()}).</p>
      <button type="button" onClick={join} disabled={joining} className="w-full bg-primary-600 text-white p-2 rounded disabled:opacity-50" data-testid="team-invitation-accept">{joining ? 'Rattachement…' : `Rejoindre ${account.pendingInvitation.organizationName}`}</button>
      <p className="text-sm text-gray-600">Vous pouvez aussi créer votre propre espace ci-dessous.</p>
    </section>}
    <p>{account.needsWorkspace ? (account.pendingInvitation ? 'Ou créez votre espace professionnel personnel.' : 'Aucun espace n’est rattaché à votre compte. Créez votre espace professionnel pour continuer.') : 'Choisissez votre profil pour continuer.'}</p>
    <form onSubmit={submit} className="space-y-4">
      {!account.hasProfile && account.clientRegistrationOpen && <label className="block">Profil<select value={profileType} onChange={e=>setProfileType(e.target.value as 'client' | 'professional')} className="block border p-2 rounded"><option value="client">Particulier</option><option value="professional">Professionnel</option></select></label>}
      {profileType === 'professional' && <>
        <label className="block">Nom de votre entreprise<input required maxLength={200} value={orgName} onChange={e=>setOrgName(e.target.value)} className="block w-full border p-2 rounded" /></label>
        <label className="block">Secteur<select value={sector} onChange={e=>{ setSector(e.target.value);setProfession(''); }} className="block border p-2 rounded">{openRegistrationSectorCodes().map(code=><option key={code} value={code}>{REGISTRATION_SECTORS[code].label}</option>)}</select></label>
        {(sector === 'health' || sector === 'field_services') && <label className="block">Profession<select required value={profession} onChange={e=>setProfession(e.target.value)} className="block border p-2 rounded"><option value="">Choisissez votre profession</option>{sector === 'health' ? PARAMEDICAL_PROFESSION_CODES.map(code=><option key={code} value={code}>{PARAMEDICAL_PROFESSIONS[code].label}</option>) : FIELD_SERVICE_PROFESSION_CODES.map(code=><option key={code} value={code}>{FIELD_SERVICE_PROFESSIONS[code].label}</option>)}</select></label>}
      </>}
      <button disabled={loading} className="bg-primary-600 text-white p-2 rounded">Continuer</button>
    </form><p role="status">{message}</p></div>;
}
