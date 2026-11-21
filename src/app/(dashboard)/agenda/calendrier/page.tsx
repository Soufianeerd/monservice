import { getOrganizationForRequest } from '@/lib/services/organization-request';
import { prepareStarterPractice } from '@/lib/services/practice-starter.service';
import CalendarView from '@/components/crm/CalendarView';
import { ParamedicalCalendar } from '@/components/scheduling/ParamedicalCalendar';
import { requireProfessional } from '@/lib/auth/session';
import { schedulingService } from '@/lib/services/scheduling.service';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import { getEventsAction } from '@/app/actions/calendar.actions';
import { defaultCalendarWindow } from '@/lib/services/calendar.service';
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

  const organization = await getOrganizationForRequest(context.organizationId);
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
    await prepareStarterPractice(organization.id, context.userId);
    const bootstrap = await schedulingService.getSchedulingBootstrap(organization.id);
    return (
      <div className="space-y-6">
        <ParamedicalCalendar bootstrap={bootstrap} />
      </div>
    );
  }

  // Generic CRM Calendar branch — fenêtre bornée ; le calendrier charge le reste
  // à la demande quand on navigue au-delà.
  const range = defaultCalendarWindow();
  const initialEvents = await getEventsAction(organization.id, range.start, range.end);

  return (
    <div className="space-y-6">
      <div className="mt-6 space-y-4">
        {initialEvents.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-500 bg-white rounded-lg shadow border border-gray-200">
            Aucun événement sur les prochains mois.
          </div>
        )}
        <CalendarView initialEvents={initialEvents} initialRange={range} />
      </div>
    </div>
  );
}
