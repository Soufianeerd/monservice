'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  SchedulingBootstrapDTO,
  AppointmentCalendarEventDTO,
  AvailabilityRuleDTO,
  AvailabilityExceptionDTO,
  AppointmentDTO,
} from '@/lib/scheduling/types';
import {
  listAppointmentsForCalendarAction,
  listAvailabilityAction,
} from '@/app/actions/scheduling.actions';
import { AppointmentForm } from './AppointmentForm';
import { AppointmentDetailsModal } from './AppointmentDetailsModal';
import {
  computeEffectiveAvailability,
  getCurrentLocalDateInTimezone,
  minutesToTimeString,
  timeStringToMinutes,
} from '@/lib/scheduling/availability';

interface Props {
  bootstrap: SchedulingBootstrapDTO;
}

function parseLocalDateStringToDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1);
}

export function ParamedicalCalendar({ bootstrap }: Props) {
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    bootstrap.locations[0]?.id || ''
  );
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<string>('');

  const selectedLocation = bootstrap.locations.find((l) => l.id === selectedLocationId);
  const selectedTimezone = selectedLocation?.timezone || 'Europe/Paris';

  // Date Navigation State (Default to current date in location timezone)
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const todayStr = getCurrentLocalDateInTimezone(new Date(), bootstrap.locations[0]?.timezone || 'Europe/Paris');
    return parseLocalDateStringToDate(todayStr);
  });
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');

  const [appointments, setAppointments] = useState<AppointmentCalendarEventDTO[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRuleDTO[]>([]);
  const [availabilityExceptions, setAvailabilityExceptions] = useState<AvailabilityExceptionDTO[]>([]);

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal States
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] = useState<AppointmentCalendarEventDTO | null>(null);
  const [modalInitialData, setModalInitialData] = useState<{
    appointmentId?: string;
    patientId?: string;
    patientName?: string;
    practitionerId?: string;
    appointmentTypeId?: string;
    locationId?: string;
    roomId?: string | null;
    localDate?: string;
    localStartTime?: string;
  } | undefined>(undefined);

  // Helper to compute date range string YYYY-MM-DD
  const formatDateISO = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Compute view bounds
  const getRangeBounds = (): { startDate: string; endDate: string; days: Date[] } => {
    const days: Date[] = [];
    if (viewMode === 'day') {
      days.push(new Date(currentDate));
      const str = formatDateISO(currentDate);
      return { startDate: str, endDate: str, days };
    }

    if (viewMode === 'week') {
      const d = new Date(currentDate);
      const dayOfWeek = d.getDay(); // 0 is Sun, 1 is Mon
      const diff = d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1); // Monday
      const monday = new Date(d.setDate(diff));

      for (let i = 0; i < 7; i++) {
        const next = new Date(monday);
        next.setDate(monday.getDate() + i);
        days.push(next);
      }
      const first = days[0] ?? new Date();
      const last = days[days.length - 1] ?? new Date();
      return {
        startDate: formatDateISO(first),
        endDate: formatDateISO(last),
        days,
      };
    }

    // Month view
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const cur = new Date(firstDay);
    while (cur <= lastDay) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }

    const first = days[0] ?? new Date();
    const last = days[days.length - 1] ?? new Date();
    return {
      startDate: formatDateISO(first),
      endDate: formatDateISO(last),
      days,
    };
  };

  const { startDate, endDate, days } = getRangeBounds();

  // Fetch appointments and availability when location, practitioner, or date range changes
  const loadCalendarData = () => {
    if (!selectedLocationId) return;

    startTransition(async () => {
      try {
        setErrorMessage(null);
        const [appts, avail] = await Promise.all([
          listAppointmentsForCalendarAction({
            locationId: selectedLocationId,
            practitionerId: selectedPractitionerId || undefined,
            startDate,
            endDate,
          }),
          selectedPractitionerId
            ? listAvailabilityAction(selectedPractitionerId, selectedLocationId)
            : Promise.resolve({ rules: [], exceptions: [] }),
        ]);

        setAppointments(appts);
        setAvailabilityRules(avail.rules);
        setAvailabilityExceptions(avail.exceptions);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Erreur de chargement du calendrier.');
        }
      }
    });
  };

  useEffect(() => {
    loadCalendarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId, selectedPractitionerId, startDate, endDate]);

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    const todayStr = getCurrentLocalDateInTimezone(new Date(), selectedTimezone);
    setCurrentDate(parseLocalDateStringToDate(todayStr));
  };

  const openNewAppointmentModal = (dateStr?: string, timeStr?: string) => {
    const defaultDate = dateStr || getCurrentLocalDateInTimezone(new Date(), selectedTimezone);
    setModalInitialData({
      locationId: selectedLocationId,
      practitionerId: selectedPractitionerId || bootstrap.practitioners[0]?.id,
      localDate: defaultDate,
      localStartTime: timeStr || '09:00',
    });
    setIsBookingModalOpen(true);
  };

  const openDetailsModal = (event: AppointmentCalendarEventDTO) => {
    setSelectedAppointmentForDetails(event);
    setIsDetailsModalOpen(true);
  };

  const openRescheduleModal = (event: AppointmentCalendarEventDTO) => {
    setModalInitialData({
      appointmentId: event.id,
      patientId: event.patientId,
      patientName: event.patientName,
      practitionerId: event.practitionerId,
      appointmentTypeId: event.appointmentTypeId,
      locationId: event.locationId,
      roomId: event.roomId,
      localDate: event.localDate,
      localStartTime: event.localStartTime,
    });
    setIsBookingModalOpen(true);
  };

  const handleModalSuccess = (_saved: AppointmentDTO) => {
    setIsBookingModalOpen(false);
    loadCalendarData();
  };

  // Hours to display in week/day grid (08:00 to 20:00)
  const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);

  return (
    <div className="space-y-6">
      {/* HEADER CONTROLS */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Location & Timezone banner */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Lieu de consultation
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
              >
                {bootstrap.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Praticien
              </label>
              <select
                value={selectedPractitionerId}
                onChange={(e) => setSelectedPractitionerId(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Tous les praticiens</option>
                {bootstrap.practitioners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 sm:mt-5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs font-medium">
              Heure du lieu — <span className="font-bold">{selectedLocation?.timezone || 'Europe/Paris'}</span>
            </div>
          </div>

          {/* Navigation & New CTA */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            <div className="flex items-center space-x-1 border border-gray-200 rounded-lg p-1 bg-gray-50">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  viewMode === 'day' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Jour
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  viewMode === 'week' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Semaine
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  viewMode === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mois
              </button>
            </div>

            <button
              onClick={() => openNewAppointmentModal()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              + Nouvelle séance
            </button>
          </div>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrev}
              className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              aria-label="Précédent"
            >
              ◀
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Aujourd&apos;hui
            </button>
            <button
              onClick={handleNext}
              className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              aria-label="Suivant"
            >
              ▶
            </button>
          </div>

          <div className="text-base font-bold text-gray-900">
            {startDate === endDate
              ? startDate
              : `Du ${startDate} au ${endDate}`}
          </div>

          {isPending && <span className="text-xs text-blue-600 font-medium">Actualisation...</span>}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {errorMessage}
        </div>
      )}

      {/* CALENDAR GRID */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {viewMode === 'month' ? (
          /* MONTH VIEW */
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
              <div key={d} className="bg-gray-50 p-2 text-center text-xs font-bold text-gray-500">
                {d}
              </div>
            ))}
            {days.map((day) => {
              const dayStr = formatDateISO(day);
              const dayAppts = appointments.filter((a) => a.localDate === dayStr);
              return (
                <div
                  key={dayStr}
                  onClick={() => openNewAppointmentModal(dayStr)}
                  className="min-h-[110px] bg-white p-2 flex flex-col justify-between hover:bg-blue-50/30 transition-colors cursor-pointer"
                >
                  <div className="text-right text-xs font-bold text-gray-700">{day.getDate()}</div>
                  <div className="space-y-1 my-1 overflow-y-auto max-h-24">
                    {dayAppts.map((a) => {
                      let badgeClass = 'bg-blue-100 text-blue-900 hover:bg-blue-200';
                      if (a.status === 'cancelled') {
                        badgeClass = 'bg-red-100 text-red-800 line-through hover:bg-red-200';
                      } else if (a.status === 'no_show') {
                        badgeClass = 'bg-amber-100 text-amber-900 hover:bg-amber-200';
                      }
                      return (
                        <div
                          key={a.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailsModal(a);
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium truncate cursor-pointer shadow-xs ${badgeClass}`}
                        >
                          <span className="font-bold">{a.localStartTime}</span> {a.patientName}
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-gray-400 text-center">+ Ajouter</div>
                </div>
              );
            })}
          </div>
        ) : (
          /* DAY / WEEK VIEW */
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Day Headers */}
              <div
                className="grid border-b border-gray-200 bg-gray-50"
                style={{ gridTemplateColumns: `80px repeat(${days.length}, minmax(0, 1fr))` }}
              >
                <div className="p-3 text-center text-xs font-bold text-gray-400">Heure</div>
                {days.map((day) => {
                  const dayStr = formatDateISO(day);
                  const isToday = formatDateISO(new Date()) === dayStr;
                  const dayName = day.toLocaleDateString('fr-FR', { weekday: 'short' });
                  return (
                    <div
                      key={dayStr}
                      className={`p-3 text-center border-l border-gray-200 ${
                        isToday ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <div className="text-xs uppercase font-semibold text-gray-500">{dayName}</div>
                      <div className={`text-base font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time Slots Grid */}
              <div
                className="grid"
                style={{ gridTemplateColumns: `80px repeat(${days.length}, minmax(0, 1fr))` }}
              >
                {HOURS.map((hour) => {
                  const timeLabel = `${String(hour).padStart(2, '0')}:00`;
                  return (
                    <React.Fragment key={hour}>
                      {/* Hour Axis */}
                      <div className="h-20 border-b border-gray-100 p-2 text-right text-xs font-semibold text-gray-400 bg-gray-50/50">
                        {timeLabel}
                      </div>

                      {/* Day Columns for this hour */}
                      {days.map((day) => {
                        const dayStr = formatDateISO(day);
                        // Filter appointments starting in this hour slot
                        const hourAppts = appointments.filter((a) => {
                          if (a.localDate !== dayStr) return false;
                          const apptHour = parseInt(a.localStartTime.split(':')[0] ?? '0', 10);
                          return apptHour === hour;
                        });

                        // Check availability for this hour if practitioner is selected
                        let isAvailableSlot = true;
                        if (selectedPractitionerId && availabilityRules.length > 0) {
                          const effective = computeEffectiveAvailability({
                            localDate: dayStr,
                            rules: availabilityRules,
                            exceptions: availabilityExceptions,
                          });
                          const slotStart = hour * 60;
                          const slotEnd = (hour + 1) * 60;
                          isAvailableSlot = effective.some(
                            (int) => slotStart < int.endMinutes && slotEnd > int.startMinutes
                          );
                        }

                        return (
                          <div
                            key={`${dayStr}-${hour}`}
                            onClick={() => openNewAppointmentModal(dayStr, timeLabel)}
                            className={`h-20 border-b border-l border-gray-100 p-1 relative transition-colors cursor-pointer hover:bg-blue-50/30 ${
                              selectedPractitionerId && !isAvailableSlot
                                ? 'bg-gray-100/50'
                                : 'bg-white'
                            }`}
                          >
                            {hourAppts.map((a) => {
                              let cardClass = 'bg-blue-600 text-white hover:bg-blue-700';
                              if (a.status === 'cancelled') {
                                cardClass = 'bg-red-500/80 text-white line-through hover:bg-red-600';
                              } else if (a.status === 'no_show') {
                                cardClass = 'bg-amber-600 text-white hover:bg-amber-700';
                              }
                              return (
                                <div
                                  key={a.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDetailsModal(a);
                                  }}
                                  className={`p-1.5 rounded-lg text-xs shadow-sm transition-all cursor-pointer mb-1 ${cardClass}`}
                                >
                                  <div className="font-bold truncate">
                                    {a.localStartTime} - {a.localEndTime}
                                  </div>
                                  <div className="font-semibold truncate">{a.patientName}</div>
                                  <div className="text-[10px] text-blue-100 truncate">
                                    {a.appointmentTypeName} {a.roomName ? `• ${a.roomName}` : ''}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DETAILS MODAL */}
      <AppointmentDetailsModal
        appointment={selectedAppointmentForDetails}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onReschedule={(appt) => {
          setIsDetailsModalOpen(false);
          openRescheduleModal(appt);
        }}
        onRefresh={loadCalendarData}
      />

      {/* MODAL (NEW / RESCHEDULE APPOINTMENT) */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <AppointmentForm
            bootstrap={bootstrap}
            initialData={modalInitialData}
            onSuccess={handleModalSuccess}
            onCancel={() => setIsBookingModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
