import { Tabs } from '@/components/ui/Tabs';
import { requireProfessional } from '@/lib/auth/session';
import { resolveWorkspace } from '@/lib/workspaces/resolver';

export default async function ParametresLayout({ children }: { children: React.ReactNode }) {
  const context = await requireProfessional();
  const workspace = resolveWorkspace(context);

  const tabs = [
    { name: 'Profil', href: '/parametres/profil' },
    { name: 'Organisation', href: '/parametres/organisation' },
  ];

  if (workspace.type === 'paramedical') {
    tabs.push({ name: 'Cabinet', href: '/parametres/cabinet' });
  }

  tabs.push(
    { name: 'Facturation', href: '/parametres/facturation' },
    { name: 'Notifications', href: '/parametres/notifications' }
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez votre profil, votre organisation et vos préférences.
        </p>
      </div>
      
      <Tabs tabs={tabs} />
      
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
