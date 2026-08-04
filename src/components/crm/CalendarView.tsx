'use client';

import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { useAuth } from '@/components/auth/AuthContext';
import * as calendarActions from '@/app/actions/calendar.actions';
import * as taskActions from '@/app/actions/task.actions';
import * as dealActions from '@/app/actions/deal.actions';
import * as invoiceActions from '@/app/actions/invoice.actions';
import { handleError } from '@/lib/utils/error-handler';

export default function CalendarView({ initialEvents = [] }: { initialEvents?: any[] }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>(initialEvents);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  const handleEventDrop = async (info: any) => {
    const { event } = info;
    const newStart = event.start;
    const originalId = event.extendedProps.originalId;
    const type = event.extendedProps.type;

    if (!newStart || !user?.organizationId) return;

    try {
      if (type === 'task') {
        await taskActions.updateAction(originalId, user.organizationId, { dueDate: newStart.toISOString() }, user.id);
      } else if (type === 'deal') {
        await dealActions.updateAction(originalId, user.organizationId, { expectedCloseDate: newStart.toISOString() }, user.id);
      } else if (type === 'invoice') {
        await invoiceActions.updateAction(originalId, user.organizationId, { dueDate: newStart.toISOString().split('T')[0] }, user.id);
      }
    } catch (error) {
      handleError(error, "Erreur lors de la mise à jour de l'événement");
      info.revert();
    }
  };

  const handleEventClick = (info: any) => {
    // Optionally open a modal or navigate to the item
    alert(`Événement: ${info.event.title}\nType: ${info.event.extendedProps.type}`);
  };



  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={events}
        editable={true}
        droppable={true}
        eventDrop={handleEventDrop}
        eventClick={handleEventClick}
        height="auto"
        locales={[frLocale]}
        locale="fr"
      />
    </div>
  );
}
