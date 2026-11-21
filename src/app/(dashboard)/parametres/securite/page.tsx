import { Metadata } from 'next';
import { getTwoFactorStatusAction } from '@/app/actions/two-factor.actions';
import TwoFactorSettings from '@/components/settings/TwoFactorSettings';

export const metadata: Metadata = {
  title: 'Sécurité du compte | MonService',
  description: 'Gérez la sécurité de votre compte et la double authentification.',
};

export default async function SecurityPage() {
  const status = await getTwoFactorStatusAction();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sécurité du compte</h1>
        <p className="mt-1 text-sm text-gray-600">
          Protégez l’accès à vos clients et à vos factures, même si votre mot de passe venait à fuiter.
        </p>
      </div>
      <TwoFactorSettings initiallyEnabled={status.enabled} available={status.available} />
    </div>
  );
}
