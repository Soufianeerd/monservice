import { redirect } from 'next/navigation';
import AuthLayout from '@/components/auth/AuthLayout';
import SecondFactorForm from '@/components/auth/SecondFactorForm';
import { getPendingSecondFactorContext, getSessionContext } from '@/lib/auth/session';

export default async function SecondFactorPage(props: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await props.searchParams;
  const safeCallback = callbackUrl?.startsWith('/') && !callbackUrl.startsWith('//') && !callbackUrl.includes('\\') ? callbackUrl : '/dashboard';
  if (!(await getPendingSecondFactorContext())) {
    redirect((await getSessionContext()) ? safeCallback : '/login');
  }
  return (
    <AuthLayout
      title="Vérification en deux étapes"
      subtitle="Saisissez le code à 6 chiffres affiché par votre application d’authentification."
    >
      <SecondFactorForm destination={safeCallback} />
    </AuthLayout>
  );
}
