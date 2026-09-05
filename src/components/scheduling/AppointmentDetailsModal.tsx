'use client';

import React, { useState, useEffect } from 'react';
import { AppointmentCalendarEventDTO, APPOINTMENT_CANCELLATION_REASON_CODES, AppointmentCancellationReasonCode, WaitlistMatchDTO } from '@/lib/scheduling/types';
import { cancelAppointmentAction, markAppointmentNoShowAction, listMatchingWaitlistForAppointmentAction } from '@/app/actions/scheduling.actions';
import Link from 'next/link';

interface AppointmentDetailsModalProps {
  appointment: AppointmentCalendarEventDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onReschedule: (appointment: AppointmentCalendarEventDTO) => void;
  onRefresh: () => void;
}

const CANCELLATION_REASON_LABELS: Record<AppointmentCancellationReasonCode, string> = {
  patient_request: 'Demande du patient',
  practitioner_request: 'Demande du praticien',
  practice_unavailable: 'Cabinet indisponible / Fermeture exceptionnelle',
  scheduling_error: 'Erreur de saisie / Planification',
  duplicate: 'Doublon de rendez-vous',
  other: 'Autre motif administratif',
};

export function AppointmentDetailsModal({
  appointment,
  isOpen,
  onClose,
  onReschedule,
  onRefresh,
}: AppointmentDetailsModalProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedReason, setSelectedReason] = useState<AppointmentCancellationReasonCode>('patient_request');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [matchingCandidates, setMatchingCandidates] = useState<WaitlistMatchDTO[] | null>(null);

  useEffect(() => {
    setIsCancelling(false);
    setSelectedReason('patient_request');
    setErrorMessage(null);
    setMatchingCandidates(null);
  }, [appointment, isOpen]);

  if (!isOpen || !appointment) return null;

  const isTerminal = appointment.status === 'cancelled' || appointment.status === 'no_show';

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await cancelAppointmentAction({
        appointmentId: appointment.id,
        reasonCode: selectedReason,
      });

      // Find matching waitlist candidates
      try {
        const matches = await listMatchingWaitlistForAppointmentAction(appointment.id);
        setMatchingCandidates(matches);
      } catch {
        // Non-blocking
      }

      setIsCancelling(false);
      onRefresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Une erreur est survenue lors de l'annulation de la séance");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNoShowSubmit = async () => {
    if (!appointment) return;
    const confirm = window.confirm('Marquer le patient comme absent pour cette séance ?');
    if (!confirm) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await markAppointmentNoShowAction(appointment.id);
      onRefresh();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Une erreur est survenue lors du marquage de l'absence");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Détails de la séance</h3>
            <div className="mt-1 flex items-center gap-2">
              {appointment.status === 'scheduled' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  Planifiée
                </span>
              )}
              {appointment.status === 'cancelled' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                  Annulée
                </span>
              )}
              {appointment.status === 'no_show' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  Patient absent
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
            aria-label="Fermer"
          >
            &times;
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {errorMessage}
          </div>
        )}

        {matchingCandidates !== null && matchingCandidates.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            <p className="text-sm font-semibold text-blue-900">
              💡 {matchingCandidates.length} patient(s) en attente correspondent à ce créneau libéré !
            </p>
            <Link
              href="/agenda/liste-attente"
              className="inline-block text-xs font-medium text-blue-700 hover:text-blue-900 underline"
            >
              Consulter la liste d'attente &rarr;
            </Link>
          </div>
        )}

        {/* Appointment Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="block text-gray-500 font-medium">Patient</span>
            <span className="text-gray-900 font-semibold">{appointment.patientName}</span>
          </div>
          <div>
            <span className="block text-gray-500 font-medium">Praticien</span>
            <span className="text-gray-900 font-semibold">{appointment.practitionerName}</span>
          </div>
          <div>
            <span className="block text-gray-500 font-medium">Type de séance</span>
            <span className="text-gray-900">{appointment.appointmentTypeName}</span>
          </div>
          <div>
            <span className="block text-gray-500 font-medium">Lieu & Salle</span>
            <span className="text-gray-900">
              {appointment.locationName}
              {appointment.roomName ? ` (${appointment.roomName})` : ''}
            </span>
          </div>
          <div>
            <span className="block text-gray-500 font-medium">Date & Horaires</span>
            <span className="text-gray-900">
              {appointment.localDate} • {appointment.localStartTime} - {appointment.localEndTime}
            </span>
          </div>
          <div>
            <span className="block text-gray-500 font-medium">Fuseau horaire</span>
            <span className="text-gray-600">{appointment.timezone}</span>
          </div>
        </div>

        {/* Terminal Status Details */}
        {appointment.status === 'cancelled' && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-1 text-sm">
            <div className="text-gray-500 font-medium">Motif d'annulation :</div>
            <div className="text-gray-900 font-semibold">
              {appointment.cancellationReasonCode
                ? CANCELLATION_REASON_LABELS[appointment.cancellationReasonCode]
                : 'Non spécifié'}
            </div>
            {appointment.cancelledAt && (
              <div className="text-xs text-gray-500 mt-1">
                Annulé le : {new Date(appointment.cancelledAt).toLocaleString('fr-FR')}
              </div>
            )}
            <p className="text-xs text-emerald-700 font-medium mt-2">
              ✓ Ce créneau a été libéré immédiatement pour de nouvelles réservations.
            </p>
          </div>
        )}

        {appointment.status === 'no_show' && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-1 text-sm">
            <div className="text-gray-500 font-medium">Statut :</div>
            <div className="text-amber-800 font-semibold">Absence constatée du patient</div>
            {appointment.noShowAt && (
              <div className="text-xs text-gray-500 mt-1">
                Marqué absent le : {new Date(appointment.noShowAt).toLocaleString('fr-FR')}
              </div>
            )}
            <p className="text-xs text-emerald-700 font-medium mt-2">
              ✓ Ce créneau a été libéré administrativement.
            </p>
          </div>
        )}

        {/* Cancellation Form */}
        {isCancelling && appointment.status === 'scheduled' && (
          <form onSubmit={handleCancelSubmit} className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-4">
            <h4 className="text-sm font-bold text-red-900">Confirmation d'annulation</h4>
            <p className="text-xs text-red-700">
              L'annulation est définitive et libérera immédiatement le créneau pour d'autres patients.
            </p>
            <div>
              <label htmlFor="cancel-reason" className="block text-xs font-semibold text-gray-700 mb-1">
                Motif d'annulation obligatoire
              </label>
              <select
                id="cancel-reason"
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value as AppointmentCancellationReasonCode)}
                className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-red-500 focus:ring-red-500"
                disabled={isSubmitting}
              >
                {APPOINTMENT_CANCELLATION_REASON_CODES.map((code) => (
                  <option key={code} value={code}>
                    {CANCELLATION_REASON_LABELS[code]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCancelling(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Retour
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Annulation...' : 'Confirmer l’annulation'}
              </button>
            </div>
          </form>
        )}

        {/* Actions Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          {!isTerminal && !isCancelling ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsCancelling(true)}
                className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition"
                disabled={isSubmitting}
              >
                Annuler la séance
              </button>
              <button
                type="button"
                onClick={handleNoShowSubmit}
                className="px-3 py-2 text-sm font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition"
                disabled={isSubmitting}
              >
                Marquer absent
              </button>
            </div>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            {!isTerminal && !isCancelling && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReschedule(appointment);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition"
              >
                Replanifier
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
