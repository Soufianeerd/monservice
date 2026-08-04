import CalendarView from '@/components/crm/CalendarView';
import { getSessionAction } from '@/app/actions/session';
import { getEventsAction } from '@/app/actions/calendar.actions';

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
  const { user } = await getSessionAction();
  let initialEvents: CalendarEvent[] = [];
  
  if (user?.organizationId) {
    const dStart = new Date();
    dStart.setFullYear(dStart.getFullYear() - 1);
    const dEnd = new Date();
    dEnd.setFullYear(dEnd.getFullYear() + 2);
    
    initialEvents = await getEventsAction(
      user.organizationId,
      dStart.toISOString(),
      dEnd.toISOString()
    );
  }

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
