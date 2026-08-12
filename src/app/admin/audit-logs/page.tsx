import { Metadata } from 'next';
import { requireSession } from '@/lib/auth/session';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';

export const metadata: Metadata = {
  title: 'Journaux d\'audit | Administration',
};

export default async function AuditLogsPage() {
  await requireSession();

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Administration : Audit Logs</h1>
      <AuditLogViewer />
    </div>
  );
}
