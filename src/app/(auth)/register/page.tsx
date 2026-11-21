import { connection } from 'next/server';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';
import RegisterForm from '@/components/auth/RegisterForm';
import InvitedMemberRegisterForm from '@/components/auth/InvitedMemberRegisterForm';
import { isClientAccessEnabled } from '@/lib/launch/client-access';
import { isWellFormedInvitationToken } from '@/lib/team/invitation';
import { previewTeamInvitation } from '@/lib/services/team.service';

export default async function RegisterPage(props: { searchParams: Promise<{ invitation?: string | string[] }> }) {
  // L'ouverture des comptes « particulier » est décidée par le serveur à l'exécution.
  await connection();
  const { invitation } = await props.searchParams;

  if (invitation !== undefined) {
    const preview = isWellFormedInvitationToken(invitation) ? await previewTeamInvitation(invitation) : null;
    if (preview?.state === 'pending' && isWellFormedInvitationToken(invitation)) {
      return (
        <AuthLayout title="Rejoindre votre équipe" subtitle={`Créez votre compte pour rejoindre ${preview.organizationName}.`}>
          <InvitedMemberRegisterForm token={invitation} email={preview.email} organizationName={preview.organizationName} />
        </AuthLayout>
      );
    }
    return (
      <AuthLayout title="Invitation indisponible" subtitle="Ce lien d’invitation a expiré, a été retiré ou a déjà été utilisé.">
        <p className="text-sm text-gray-600">Demandez un nouveau lien à la personne qui vous a invité, ou <Link href="/register" className="font-medium text-primary-600">créez votre propre espace</Link>.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Créez votre espace professionnel"
      subtitle="Gratuit pendant le lancement, sans carte bancaire. Prêt en deux minutes."
    >
      <RegisterForm clientRegistrationOpen={isClientAccessEnabled()} />
    </AuthLayout>
  );
}
