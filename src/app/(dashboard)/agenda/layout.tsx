import { Tabs } from '@/components/ui/Tabs';
import { requireProfessional } from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import { notFound } from 'next/navigation';

export default async function AgendaLayout({ children }: { children: React.ReactNode }) {
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
    { name: workspace.type === 'paramedical' ? 'Rendez-vous' : 'Calendrier', href: '/agenda/calendrier' },
  ];

  if (workspace.type === 'paramedical') {
    tabs.push(
      { name: 'Horaires et absences', href: '/agenda/disponibilites' },
      { name: 'Types de séances', href: '/agenda/types-seances' },
      { name: "Liste d'attente", href: '/agenda/liste-attente' }
    );
  }

  tabs.push({ name: 'Tâches', href: '/agenda/taches' });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agenda</h1>
          <p className="mt-1 text-sm text-gray-500">
            {workspace.type === 'paramedical'
              ? 'Planifiez les rendez-vous de vos patients. Réglez vos horaires habituels et vos absences.'
              : 'Gérez vos tâches et consultez votre calendrier.'}
          </p>
        </div>
      </div>
      
      <Tabs tabs={tabs} />
      
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
