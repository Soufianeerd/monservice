import { connection } from 'next/server';
import AuthLayout from '@/components/auth/AuthLayout';
import RegisterForm from '@/components/auth/RegisterForm';
import { isClientAccessEnabled } from '@/lib/launch/client-access';

export default async function RegisterPage() {
  // L'ouverture des comptes « particulier » est décidée par le serveur à l'exécution.
  await connection();
  return (
    <AuthLayout
      title="Créez votre compte"
      subtitle="Rejoignez-nous et commencez à développer votre activité dès aujourd'hui."
    >
      <RegisterForm clientRegistrationOpen={isClientAccessEnabled()} />
    </AuthLayout>
  );
}
