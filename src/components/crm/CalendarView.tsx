'use client';

import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { useAuth } from '@/components/auth/AuthContext';
import { calendarService } from '@/lib/services/calendar.service';
import { taskService } from '@/lib/services/task.service';
import { dealService } from '@/lib/services/deal.service';
import { invoiceService } from '@/lib/services/invoice.service';
import { handleError } from '@/lib/utils/error-handler';

export default function CalendarView() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      if (!user?.organizationId) return;
      setIsLoading(true);
      
      try {
        // Fetch 1 year past and 2 years future for simplicity, since FullCalendar standard event array expects all loaded events.
        const dStart = new Date();
        dStart.setFullYear(dStart.getFullYear() - 1);
        const dEnd = new Date();
        dEnd.setFullYear(dEnd.getFullYear() + 2);

        const rawEvents = await calendarService.getEvents(
          user.organizationId,
          dStart.toISOString(),
          dEnd.toISOString()
        );

        const formattedEvents = rawEvents.map((evt: any) => {
          let backgroundColor = '#4f46e5';
          let borderColor = '#4338ca';

          if (evt.type === 'deal') {
            backgroundColor = '#059669';
            borderColor = '#047857';
          } else if (evt.type === 'invoice') {
            backgroundColor = '#dc2626';
            borderColor = '#b91c1c';
          }

          return {
            id: `${evt.type}_${evt.id}`,
            title: evt.title,
            start: new Date(evt.date),
            allDay: true,
            backgroundColor,
            borderColor,
            extendedProps: {
              type: evt.type,
              status: evt.status,
              originalId: evt.id
            }
          };
        });

        setEvents(formattedEvents);
      } catch (error) {
        handleError(error, "Erreur lors du chargement des événements");
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [user]);

  const handleEventDrop = async (info: any) => {
    const { event } = info;
    const newStart = event.start;
    const originalId = event.extendedProps.originalId;
    const type = event.extendedProps.type;

    if (!newStart || !user?.organizationId) return;

    try {
      if (type === 'task') {
        await taskService.update(originalId, user.organizationId, { dueDate: newStart.toISOString() }, user.id);
      } else if (type === 'deal') {
        await dealService.update(originalId, user.organizationId, { expectedCloseDate: newStart.toISOString() }, user.id);
      } else if (type === 'invoice') {
        await invoiceService.update(originalId, user.organizationId, { dueDate: newStart.toISOString().split('T')[0] }, user.id);
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

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Chargement du calendrier...</div>;
  }

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
