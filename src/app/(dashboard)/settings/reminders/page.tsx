'use client';

import { useAuth } from '@/components/auth/AuthContext';
import ReminderSettingsForm from '@/components/settings/ReminderSettings';

export default function RemindersPage() {
  const { user } = useAuth();

  if (!user?.organizationId) return <div>Chargement...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Relances Automatisées</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configurez vos règles de relance pour les devis et les factures. Ces relances sont envoyées par email (simulé).
        </p>
      </div>

      <ReminderSettingsForm organizationId={user.organizationId} />
    </div>
  );
}
