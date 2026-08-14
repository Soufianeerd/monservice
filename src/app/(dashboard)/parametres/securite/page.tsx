import { Metadata } from 'next';
import { requireSession } from '@/lib/auth/session';
import { MFASettings } from '@/components/settings/MFASettings';
import { db } from '@/lib/db/server';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const metadata: Metadata = {
  title: 'Sécurité du compte | MonService',
  description: 'Gérez la sécurité de votre compte et l\'authentification à deux facteurs.',
};

export default async function SecurityPage() {
  const session = await requireSession();
  
  const isEnabled = false; // MFA state is now managed by Supabase Auth

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Sécurité et Accès</h1>
      <MFASettings user={{ mfaEnabled: isEnabled }} />
    </div>
  );
}
