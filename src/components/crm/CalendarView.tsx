'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { DatesSetArg } from '@fullcalendar/core';
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

type LoadedRange = { start: string; end: string };

export default function CalendarView({ initialEvents = [], initialRange }: { initialEvents?: any[]; initialRange?: LoadedRange }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>(initialEvents);
  // Période déjà chargée : la page ne charge qu'une fenêtre bornée, le reste
  // est demandé quand la vue affichée en sort.
  const loaded = useRef<LoadedRange | undefined>(initialRange);

  useEffect(() => {
    setEvents(initialEvents);
    loaded.current = initialRange;
  }, [initialEvents, initialRange]);

  const handleDatesSet = useCallback(async ({ start, end }: DatesSetArg) => {
    const current = loaded.current;
    if (!current) return;
    const from = start.toISOString();
    const to = end.toISOString();
    // Seules les parties manquantes sont demandées (la navigation est contiguë).
    const missing: LoadedRange[] = [];
    if (from < current.start) missing.push({ start: from, end: current.start });
    if (to > current.end) missing.push({ start: current.end, end: to });
    if (missing.length === 0) return;
    loaded.current = { start: from < current.start ? from : current.start, end: to > current.end ? to : current.end };
    try {
      const batches = [];
      for (const range of missing) batches.push(await calendarActions.getEventsAction(undefined, range.start, range.end));
      const more = batches.flat();
      setEvents((previous) => {
        const known = new Set(previous.map((evt) => evt.id));
        return [...previous, ...more.filter((evt) => !known.has(evt.id))];
      });
    } catch (error) {
      loaded.current = current;
      handleError(error, 'Impossible de charger les événements de cette période');
    }
  }, []);

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
      // L'état local suit le déplacement : un chargement ultérieur ne doit pas
      // réafficher l'ancienne date.
      setEvents((previous) => previous.map((evt) => evt.id === event.id ? { ...evt, start: newStart.toISOString() } : evt));
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
    <div data-guide-title="Le calendrier des échéances" data-guide-text="Ce calendrier affiche les échéances des tâches et des factures, ainsi que les dates prévues de clôture des opportunités. Cliquez sur un événement pour lire son résumé. Déplacer un événement modifie sa date ; les interventions BTP se planifient actuellement dans Opérations." className="bg-white p-6 rounded-lg shadow border border-gray-200">
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
        datesSet={handleDatesSet}
        height="auto"
        locales={[frLocale]}
        locale="fr"
      />
    </div>
  );
}
