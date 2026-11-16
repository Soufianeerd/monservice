import { Tabs } from '@/components/ui/Tabs';
import { requireProfessional } from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';
import { resolveWorkspace } from '@/lib/workspaces/resolver';

import { notFound } from 'next/navigation';

export default async function ParametresLayout({ children }: { children: React.ReactNode }) {
  const context = await requireProfessional();
  if (!context.organizationId) {
    notFound();
  }

  const organization = await organizationService.getById(context.organizationId);
  if (!organization) {
    notFound();
  }

  const workspace = resolveWorkspace({
    sector: organization.sector,
    profession: organization.profession,
    country: organization.country,
  });

  const tabs = [
    { name: 'Mon compte', href: '/parametres/profil' },
    { name: workspace.type === 'paramedical' ? 'Coordonnées du cabinet' : 'Organisation', href: '/parametres/organisation' },
  ];

  if (workspace.type === 'paramedical') {
    tabs.push({ name: 'Lieux et équipe', href: '/parametres/cabinet' });
  }

  tabs.push(
    { name: 'Abonnement MonService', href: '/parametres/facturation' },
    { name: 'Notifications', href: '/parametres/notifications' }
  );

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
        <p className="mt-1 text-sm text-gray-500">
          Vos informations personnelles, votre activité et votre abonnement MonService.
        </p>
      </div>
      
      <Tabs tabs={tabs} />
      
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}

