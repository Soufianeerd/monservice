import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppointmentDetailsModal } from '@/components/scheduling/AppointmentDetailsModal';
import { AppointmentCalendarEventDTO } from '@/lib/scheduling/types';
import * as actions from '@/app/actions/scheduling.actions';

vi.mock('@/app/actions/scheduling.actions', () => ({
  cancelAppointmentAction: vi.fn(),
  markAppointmentNoShowAction: vi.fn(),
  listMatchingWaitlistForAppointmentAction: vi.fn(),
}));

describe('AppointmentDetailsModal UI Component (Session 10 / 10B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseAppointment: AppointmentCalendarEventDTO = {
    id: 'appt-1',
    patientId: 'pat-1',
    patientName: 'Alice DUPONT',
    practitionerId: 'prac-1',
    practitionerName: 'Dr Martin',
    appointmentTypeId: 'type-1',
    appointmentTypeName: 'Séance de kinésithérapie',
    locationId: 'loc-1',
    locationName: 'Cabinet Paris',
    roomId: 'room-1',
    roomName: 'Salle 1',
    startsAt: '2026-09-10T08:00:00.000Z',
    endsAt: '2026-09-10T08:30:00.000Z',
    occupancyStartsAt: '2026-09-10T08:00:00.000Z',
    occupancyEndsAt: '2026-09-10T08:30:00.000Z',
    localDate: '2026-09-10',
    localStartTime: '10:00',
    localEndTime: '10:30',
    timezone: 'Europe/Paris',
    status: 'scheduled',
    cancellationReasonCode: null,
    cancelledAt: null,
    noShowAt: null,
  };

  it('renders correctly for a scheduled appointment with all action buttons', () => {
    const onReschedule = vi.fn();
    const onClose = vi.fn();
    const onRefresh = vi.fn();

    render(
      <AppointmentDetailsModal
        appointment={baseAppointment}
        isOpen={true}
        onClose={onClose}
        onReschedule={onReschedule}
        onRefresh={onRefresh}
      />
    );

    expect(screen.getByText('Détails de la séance')).toBeDefined();
    expect(screen.getByText('Planifiée')).toBeDefined();
    expect(screen.getByText('Alice DUPONT')).toBeDefined();
    expect(screen.getByText('Dr Martin')).toBeDefined();

    expect(screen.getByText('Replanifier')).toBeDefined();
    expect(screen.getByText('Annuler la séance')).toBeDefined();
    expect(screen.getByText('Marquer absent')).toBeDefined();
  });

  it('renders correctly for a cancelled appointment, hiding terminal action buttons', () => {
    const cancelledAppointment: AppointmentCalendarEventDTO = {
      ...baseAppointment,
      status: 'cancelled',
      cancellationReasonCode: 'patient_request',
      cancelledAt: '2026-09-05T08:00:00.000Z',
    };

    render(
      <AppointmentDetailsModal
        appointment={cancelledAppointment}
        isOpen={true}
        onClose={vi.fn()}
        onReschedule={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('Annulée')).toBeDefined();
    expect(screen.getByText('Demande du patient')).toBeDefined();

    expect(screen.queryByText('Replanifier')).toBeNull();
    expect(screen.queryByText('Annuler la séance')).toBeNull();
    expect(screen.queryByText('Marquer absent')).toBeNull();
  });

  it('renders correctly for a no_show appointment, hiding terminal action buttons', () => {
    const noShowAppointment: AppointmentCalendarEventDTO = {
      ...baseAppointment,
      status: 'no_show',
      noShowAt: '2026-09-05T08:00:00.000Z',
    };

    render(
      <AppointmentDetailsModal
        appointment={noShowAppointment}
        isOpen={true}
        onClose={vi.fn()}
        onReschedule={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('Patient absent')).toBeDefined();
    expect(screen.getByText('Absence constatée du patient')).toBeDefined();

    expect(screen.queryByText('Replanifier')).toBeNull();
    expect(screen.queryByText('Annuler la séance')).toBeNull();
    expect(screen.queryByText('Marquer absent')).toBeNull();
  });

  it('shows cancellation form with all 6 canonical reason codes when clicking "Annuler la séance"', async () => {
    render(
      <AppointmentDetailsModal
        appointment={baseAppointment}
        isOpen={true}
        onClose={vi.fn()}
        onReschedule={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Annuler la séance'));

    expect(screen.getByText("Confirmation d'annulation")).toBeDefined();
    expect(screen.getByLabelText("Motif d'annulation obligatoire")).toBeDefined();

    const select = screen.getByLabelText("Motif d'annulation obligatoire") as HTMLSelectElement;
    expect(select.options.length).toBe(6);

    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toEqual([
      'patient_request',
      'practitioner_request',
      'practice_unavailable',
      'scheduling_error',
      'duplicate',
      'other',
    ]);
  });

  it('submits cancellation with selected reason code and triggers refresh', async () => {
    vi.mocked(actions.cancelAppointmentAction).mockResolvedValue({
      id: 'appt-1',
      organizationId: 'org-1',
      patientId: 'pat-1',
      practitionerId: 'prac-1',
      appointmentTypeId: 'type-1',
      locationId: 'loc-1',
      roomId: 'room-1',
      createdByUserId: 'user-1',
      startsAt: '2026-09-10T08:00:00.000Z',
      endsAt: '2026-09-10T08:30:00.000Z',
      occupancyStartsAt: '2026-09-10T08:00:00.000Z',
      occupancyEndsAt: '2026-09-10T08:30:00.000Z',
      timezone: 'Europe/Paris',
      status: 'cancelled',
      cancellationReasonCode: 'duplicate',
      cancelledAt: '2026-09-05T08:00:00.000Z',
      noShowAt: null,
      createdAt: '2026-09-04T00:00:00.000Z',
      updatedAt: '2026-09-05T08:00:00.000Z',
    });

    vi.mocked(actions.listMatchingWaitlistForAppointmentAction).mockResolvedValue([]);

    const onRefresh = vi.fn();

    render(
      <AppointmentDetailsModal
        appointment={baseAppointment}
        isOpen={true}
        onClose={vi.fn()}
        onReschedule={vi.fn()}
        onRefresh={onRefresh}
      />
    );

    fireEvent.click(screen.getByText('Annuler la séance'));

    const select = screen.getByLabelText("Motif d'annulation obligatoire");
    fireEvent.change(select, { target: { value: 'duplicate' } });

    fireEvent.click(screen.getByText('Confirmer l’annulation'));

    await waitFor(() => {
      expect(actions.cancelAppointmentAction).toHaveBeenCalledWith({
        appointmentId: 'appt-1',
        reasonCode: 'duplicate',
      });
      expect(onRefresh).toHaveBeenCalled();
    });
  });
});
