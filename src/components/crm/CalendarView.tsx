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
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import type { DateClickArg } from '@fullcalendar/interaction';

type LoadedRange = { start: string; end: string };

export default function CalendarView({ initialEvents = [], initialRange }: { initialEvents?: any[]; initialRange?: LoadedRange }) {
  const { user } = useAuth();
  const router = useRouter();
  // Nouveau rendez-vous : enregistré comme une tâche datée (heure comprise).
  const [draft, setDraft] = useState<{ title: string; date: string; time: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const openDraft = (date?: Date, allDay = true) => {
    const base = date ?? new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setDraft({
      title: '',
      date: `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`,
      time: allDay ? '09:00' : `${pad(base.getHours())}:${pad(base.getMinutes())}`,
    });
  };

  const saveDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft || !draft.title.trim()) return;
    setSaving(true);
    try {
      const start = new Date(`${draft.date}T${draft.time || '09:00'}`);
      const task = await taskActions.createAction({
        title: draft.title.trim(),
        description: 'Rendez-vous',
        status: 'todo',
        priority: 'medium',
        dueDate: start.toISOString(),
      });
      setEvents((previous) => [...previous, {
        id: `task_${task.id}`, title: task.title, start: start.toISOString(), allDay: false,
        backgroundColor: '#4f46e5', borderColor: '#4338ca',
        extendedProps: { type: 'task', status: 'todo', originalId: task.id },
      }]);
      toast.success('Rendez-vous ajouté');
      setDraft(null);
    } catch (error) {
      handleError(error, 'Impossible d’ajouter le rendez-vous');
    } finally {
      setSaving(false);
    }
  };
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
    // Seuls les rendez-vous et tâches se déplacent ici : l'échéance d'une facture
    // ou la date d'une opportunité se modifient depuis leur fiche.
    if (type !== 'task') {
      info.revert();
      toast('Modifiez cette date depuis la fiche, pas depuis le calendrier.');
      return;
    }

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

  // Un clic ouvre l'élément concerné.
  const handleEventClick = (info: any) => {
    const { type, originalId } = info.event.extendedProps;
    if (type === 'invoice') router.push(`/facturation/factures/${originalId}`);
    else if (type === 'deal') router.push(`/deals/${originalId}`);
    else router.push('/agenda/taches');
  };



  return (
    <div data-guide-title="Le calendrier des échéances" data-guide-text="Ce calendrier affiche les échéances des tâches et des factures, ainsi que les dates prévues de clôture des opportunités. Cliquez sur un jour ou sur « Nouveau rendez-vous » pour en ajouter un ; cliquez sur un événement pour ouvrir sa fiche. Les rendez-vous et tâches se déplacent par glisser-déposer ; les interventions BTP se planifient dans Opérations." className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={() => openDraft()} className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
          + Nouveau rendez-vous
        </button>
      </div>

      {draft && (
        <form onSubmit={saveDraft} aria-label="Nouveau rendez-vous" className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="appointment-title" className="block text-xs font-medium text-gray-700">Objet *</label>
            <input id="appointment-title" autoFocus required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Ex. Rendez-vous avec M. Martin" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label htmlFor="appointment-date" className="block text-xs font-medium text-gray-700">Date *</label>
            <input id="appointment-date" type="date" required value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label htmlFor="appointment-time" className="block text-xs font-medium text-gray-700">Heure</label>
            <input id="appointment-time" type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? 'Ajout…' : 'Ajouter'}</button>
            <button type="button" onClick={() => setDraft(null)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Annuler</button>
          </div>
        </form>
      )}

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
        dateClick={(arg: DateClickArg) => openDraft(arg.date, arg.allDay)}
        datesSet={handleDatesSet}
        height="auto"
        locales={[frLocale]}
        locale="fr"
      />
    </div>
  );
}
