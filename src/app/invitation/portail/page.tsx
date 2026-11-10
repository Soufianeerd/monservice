import Link from 'next/link';
import type { Metadata } from 'next';
import { getSessionContext } from '@/lib/auth/session';
import { isWellFormedInvitationToken } from '@/lib/client-portal/invitation-token';
import { previewClientPortalInvitation } from '@/lib/services/client-portal-invitation.service';
import AcceptInvitationForm from './AcceptInvitationForm';

export const metadata: Metadata = { title: 'Invitation à votre espace client', robots: { index: false, follow: false } };

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-8 space-y-4" data-testid="portal-invitation">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {children}
      </div>
    </main>
  );
}

export default async function ClientPortalInvitationPage(props: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await props.searchParams;
  if (!isWellFormedInvitationToken(token)) {
    return (
      <Card title="Lien invalide">
        <p className="text-sm text-gray-600">Ce lien d’invitation est incomplet. Ouvrez-le directement depuis l’e-mail reçu, ou demandez un nouveau lien à votre prestataire.</p>
      </Card>
    );
  }

  const ctx = await getSessionContext();
  const here = `/invitation/portail?token=${token}`;

  if (!ctx) {
    return (
      <Card title="Votre espace client">
        <p className="text-sm text-gray-600">Un prestataire vous invite à suivre vos devis, factures et interventions. Connectez-vous avec l’adresse e-mail qui a reçu l’invitation.</p>
        <div className="flex flex-col gap-2">
          <Link href={`/login?callbackUrl=${encodeURIComponent(here)}`} className="rounded-md bg-indigo-600 px-4 py-2 text-center font-medium text-white hover:bg-indigo-700">Se connecter</Link>
          <Link href="/register" className="rounded-md border border-gray-300 px-4 py-2 text-center font-medium text-gray-700 hover:bg-gray-50">Créer un compte particulier</Link>
        </div>
        <p className="text-xs text-gray-500">Après la création et la vérification de votre compte, rouvrez ce lien depuis l’e-mail d’invitation pour l’accepter.</p>
      </Card>
    );
  }

  if (ctx.profileType !== 'client') {
    return (
      <Card title="Compte professionnel connecté">
        <p className="text-sm text-gray-600">Cette invitation est destinée à un compte client. Déconnectez-vous, puis rouvrez ce lien avec le compte de l’adresse invitée.</p>
      </Card>
    );
  }

  const preview = await previewClientPortalInvitation(token);
  if (!preview || preview.state === 'unavailable' || preview.state === 'revoked' || preview.state === 'expired') {
    return (
      <Card title="Invitation indisponible">
        <p className="text-sm text-gray-600">
          {preview?.state === 'expired' ? 'Cette invitation a expiré.' : 'Cette invitation a été retirée ou a déjà été utilisée.'} Demandez un nouveau lien à votre prestataire.
        </p>
        <Link href="/client/dashboard" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Aller à mon espace</Link>
      </Card>
    );
  }

  if (preview.state === 'accepted') {
    return (
      <Card title="Invitation déjà acceptée">
        <p className="text-sm text-gray-600">Votre espace avec {preview.organizationName} est actif.</p>
        <Link href="/client/dashboard" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Aller à mon espace</Link>
      </Card>
    );
  }

  if (!preview.emailMatches) {
    return (
      <Card title="Adresse e-mail différente">
        <p className="text-sm text-gray-600">Cette invitation de {preview.organizationName} a été envoyée à une autre adresse que celle de votre compte. Connectez-vous avec le compte de l’adresse invitée, ou demandez à votre prestataire de vous inviter avec {ctx.email ?? 'votre adresse actuelle'}.</p>
      </Card>
    );
  }

  return (
    <Card title={`${preview.organizationName} vous invite`}>
      <p className="text-sm text-gray-600">En acceptant, {preview.organizationName} relie votre compte à votre fiche client : vous verrez ici les devis, factures et interventions qu’il partage avec vous. Le prestataire peut retirer cet accès à tout moment.</p>
      <AcceptInvitationForm token={token} />
    </Card>
  );
}
