import { Metadata } from 'next';
import { requireSession } from '@/lib/auth/session';
import { RetentionManager } from '@/components/settings/RetentionManager';

export const metadata: Metadata = {
  title: 'Archivage et Conservation | MonService',
  description: 'Gérez vos obligations de conservation légale et d\'archivage.',
};

export default async function RetentionPage() {
  const session = await requireSession();

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Archivage et conservation (Conformité)</h1>
      <RetentionManager organizationId={session.organizationId as string} />
    </div>
  );
}
