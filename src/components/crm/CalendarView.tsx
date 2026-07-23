'use client';

import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { useAuth } from '@/components/auth/AuthContext';
import { taskRepository, dealRepository, invoiceRepository } from '@/lib/data';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: {
    type: 'task' | 'deal' | 'invoice';
    status?: string;
    originalId: string;
  };
}

export default function CalendarView() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      if (!user?.organizationId) return;
      setIsLoading(true);
      
      try {
        const [tasks, deals, invoices] = await Promise.all([
          taskRepository.findByOrganization(user.organizationId),
          dealRepository.findByOrganization(user.organizationId),
          invoiceRepository.findByOrganization(user.organizationId)
        ]);

        const formattedEvents: CalendarEvent[] = [];

        tasks.forEach(task => {
          if (task.dueDate) {
            formattedEvents.push({
              id: `task_${task.id}`,
              title: `Tâche: ${task.title}`,
              start: new Date(task.dueDate),
              allDay: true,
              backgroundColor: '#4f46e5', // Indigo
              borderColor: '#4338ca',
              extendedProps: {
                type: 'task',
                status: task.status,
                originalId: task.id
              }
            });
          }
        });

        deals.forEach(deal => {
          if (deal.expectedCloseDate) {
            formattedEvents.push({
              id: `deal_${deal.id}`,
              title: `Deal: ${deal.name}`,
              start: new Date(deal.expectedCloseDate),
              allDay: true,
              backgroundColor: '#059669', // Emerald
              borderColor: '#047857',
              extendedProps: {
                type: 'deal',
                status: deal.stage,
                originalId: deal.id
              }
            });
          }
        });

        invoices.forEach(invoice => {
          if (invoice.dueDate) {
            formattedEvents.push({
              id: `invoice_${invoice.id}`,
              title: `Échéance Facture: ${invoice.number}`,
              start: new Date(invoice.dueDate),
              allDay: true,
              backgroundColor: '#dc2626', // Red
              borderColor: '#b91c1c',
              extendedProps: {
                type: 'invoice',
                status: invoice.status,
                originalId: invoice.id
              }
            });
          }
        });

        setEvents(formattedEvents);
      } catch (error) {
        console.error("Failed to load events", error);
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

    if (!newStart) return;

    try {
      if (type === 'task') {
        await taskRepository.update(originalId, { dueDate: newStart.toISOString() });
      } else if (type === 'deal') {
        await dealRepository.update(originalId, { expectedCloseDate: newStart.toISOString() });
      } else if (type === 'invoice') {
        await invoiceRepository.update(originalId, { dueDate: newStart.toISOString().split('T')[0] });
      }
    } catch (error) {
      console.error("Failed to update event", error);
      info.revert();
    }
  };

  const handleEventClick = (info: any) => {
    // Optionally open a modal or navigate to the item
    alert(`Événement: ${info.event.title}\nType: ${info.event.extendedProps.type}`);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Chargement du calendrier...</div>;
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
