import Link from 'next/link';
import type { Metadata } from 'next';
import { getSessionContext } from '@/lib/auth/session';
import { isWellFormedInvitationToken, TEAM_ROLE_LABELS } from '@/lib/team/invitation';
import { previewTeamInvitation } from '@/lib/services/team.service';
import AcceptTeamInvitationButton from './AcceptTeamInvitationButton';

export const metadata: Metadata = { title: 'Invitation à rejoindre une équipe', robots: { index: false, follow: false } };

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-8 space-y-4" data-testid="team-invitation">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {children}
      </div>
    </main>
  );
}

const primary = 'rounded-md bg-indigo-600 px-4 py-2 text-center font-medium text-white hover:bg-indigo-700';
const secondary = 'rounded-md border border-gray-300 px-4 py-2 text-center font-medium text-gray-700 hover:bg-gray-50';

export default async function TeamInvitationPage(props: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await props.searchParams;
  if (!isWellFormedInvitationToken(token)) {
    return (
      <Card title="Lien invalide">
        <p className="text-sm text-gray-600">Ce lien d’invitation est incomplet. Ouvrez-le directement depuis l’e-mail reçu, ou demandez un nouveau lien à la personne qui vous a invité.</p>
      </Card>
    );
  }

  const preview = await previewTeamInvitation(token);
  if (!preview || preview.state === 'revoked' || preview.state === 'expired') {
    return (
      <Card title="Invitation indisponible">
        <p className="text-sm text-gray-600">
          {preview?.state === 'expired' ? 'Cette invitation a expiré.' : 'Cette invitation a été retirée.'} Demandez un nouveau lien à la personne qui vous a invité.
        </p>
      </Card>
    );
  }

  const ctx = await getSessionContext();
  if (preview.state === 'accepted') {
    return (
      <Card title="Invitation déjà utilisée">
        <p className="text-sm text-gray-600">Cette invitation à rejoindre {preview.organizationName} a déjà été acceptée.</p>
        <Link href={ctx ? '/dashboard' : '/login'} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          {ctx ? 'Aller au tableau de bord' : 'Se connecter'}
        </Link>
      </Card>
    );
  }

  const role = TEAM_ROLE_LABELS[preview.role].toLowerCase();
  const here = `/invitation/equipe?token=${token}`;

  if (!ctx) {
    return (
      <Card title={`Rejoindre ${preview.organizationName}`}>
        <p className="text-sm text-gray-600">
          Vous êtes invité à rejoindre l’équipe de {preview.organizationName} sur MonService, en tant que {role}. L’invitation est adressée à <strong>{preview.email}</strong>.
        </p>
        <div className="flex flex-col gap-2">
          <Link href={`/register?invitation=${encodeURIComponent(token)}`} className={primary}>Créer mon compte</Link>
          <Link href={`/login?callbackUrl=${encodeURIComponent(here)}`} className={secondary}>J’ai déjà un compte</Link>
        </div>
      </Card>
    );
  }

  if (ctx.profileType !== 'professional') {
    return (
      <Card title="Compte non professionnel">
        <p className="text-sm text-gray-600">Cette invitation est destinée à un compte professionnel. Déconnectez-vous, puis créez un compte avec l’adresse {preview.email}.</p>
      </Card>
    );
  }

  if ((ctx.email ?? '').toLowerCase() !== preview.email) {
    return (
      <Card title="Adresse e-mail différente">
        <p className="text-sm text-gray-600">
          Cette invitation de {preview.organizationName} est adressée à {preview.email}, pas à l’adresse de votre compte. Connectez-vous avec le bon compte, ou demandez une invitation pour {ctx.email ?? 'votre adresse'}.
        </p>
      </Card>
    );
  }

  if (ctx.organizationId) {
    return (
      <Card title="Compte déjà rattaché">
        <p className="text-sm text-gray-600">
          Votre compte appartient déjà à une organisation. Un compte MonService ne peut appartenir qu’à une seule équipe : demandez une invitation sur une autre adresse e-mail.
        </p>
        <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Aller au tableau de bord</Link>
      </Card>
    );
  }

  return (
    <Card title={`Rejoindre ${preview.organizationName}`}>
      <p className="text-sm text-gray-600">
        En acceptant, votre compte rejoint l’équipe de {preview.organizationName} en tant que {role} : vous accédez à ses clients, devis, factures et interventions. Un administrateur peut retirer cet accès à tout moment.
      </p>
      <AcceptTeamInvitationButton token={token} />
    </Card>
  );
}
