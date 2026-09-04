import CalendarView from '@/components/crm/CalendarView';
import { ParamedicalCalendar } from '@/components/scheduling/ParamedicalCalendar';
import { requireProfessional } from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';
import { schedulingService } from '@/lib/services/scheduling.service';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import { getEventsAction } from '@/app/actions/calendar.actions';
import { notFound } from 'next/navigation';

export interface CalendarEvent {
  id: string;
  title: string | null;
  start: Date | string | null;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    type: string;
    status: string | null;
    originalId: string | number;
  };
}

export default async function CalendarPage() {
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

  // Paramedical branch
  if (workspace.type === 'paramedical') {
    const bootstrap = await schedulingService.getSchedulingBootstrap(organization.id);
    return (
      <div className="space-y-6">
        <ParamedicalCalendar bootstrap={bootstrap} />
      </div>
    );
  }

  // Generic CRM Calendar branch
  const dStart = new Date();
  dStart.setFullYear(dStart.getFullYear() - 1);
  const dEnd = new Date();
  dEnd.setFullYear(dEnd.getFullYear() + 2);

  const initialEvents = await getEventsAction(
    organization.id,
    dStart.toISOString(),
    dEnd.toISOString()
  );

  return (
    <div className="space-y-6">
      <div className="mt-6">
        {initialEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow border border-gray-200">
            Aucun événement à afficher.
          </div>
        ) : (
          <CalendarView initialEvents={initialEvents} />
        )}
      </div>
    </div>
  );
}
