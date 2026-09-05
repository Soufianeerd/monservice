import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WaitlistManager } from '@/components/scheduling/WaitlistManager';
import { SchedulingBootstrapDTO, WaitlistEntryDTO } from '@/lib/scheduling/types';
import * as actions from '@/app/actions/scheduling.actions';

vi.mock('@/app/actions/scheduling.actions', () => ({
  listWaitlistEntriesAction: vi.fn(),
  resolveWaitlistEntryAction: vi.fn(),
  createWaitlistEntryAction: vi.fn(),
  updateWaitlistEntryAction: vi.fn(),
}));

describe('WaitlistManager UI Component (Session 10 / 10B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const bootstrap: SchedulingBootstrapDTO = {
    locations: [
      { id: 'loc-1', name: 'Cabinet Paris', timezone: 'Europe/Paris', isActive: true },
    ],
    practitioners: [
      { id: 'prac-1', displayName: 'Dr Martin', isActive: true, assignedLocationIds: ['loc-1'] },
    ],
    appointmentTypes: [
      {
        id: 'type-1',
        organizationId: 'org-1',
        name: 'Kiné Rééducation',
        description: null,
        durationMinutes: 30,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        slotStepMinutes: 15,
        isActive: true,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ],
    rooms: [
      { id: 'room-1', locationId: 'loc-1', name: 'Salle 1', isActive: true },
    ],
  };

  const sampleWaitingEntry: WaitlistEntryDTO = {
    id: 'wl-1',
    organizationId: 'org-1',
    patientId: 'pat-1',
    patientName: 'Alice DUPONT',
    appointmentTypeId: 'type-1',
    appointmentTypeName: 'Kiné Rééducation',
    locationId: 'loc-1',
    locationName: 'Cabinet Paris',
    practitionerId: 'prac-1',
    practitionerName: 'Dr Martin',
    preferredDateFrom: '2026-10-01',
    preferredDateUntil: '2026-10-31',
    preferredStartTime: '09:00:00',
    preferredEndTime: '12:00:00',
    timezone: 'Europe/Paris',
    status: 'waiting',
    resolutionCode: null,
    resolvedAt: null,
    resolvedAppointmentId: null,
    createdByUserId: 'user-1',
    createdAt: '2026-09-05T00:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z',
  };

  const sampleResolvedEntry: WaitlistEntryDTO = {
    ...sampleWaitingEntry,
    id: 'wl-2',
    status: 'resolved',
    resolutionCode: 'booked',
    resolvedAt: '2026-09-05T08:00:00.000Z',
    resolvedAppointmentId: 'appt-123',
  };

  it('renders correctly and loads waiting entries on mount', async () => {
    vi.mocked(actions.listWaitlistEntriesAction).mockResolvedValue({
      entries: [sampleWaitingEntry],
      total: 1,
    });

    render(<WaitlistManager bootstrap={bootstrap} />);

    expect(screen.getByText(/Liste d'attente/i)).toBeDefined();
    expect(screen.getByText('+ Inscrire un patient')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Alice DUPONT')).toBeDefined();
      expect(screen.getByText('En attente')).toBeDefined();
      expect(screen.getByText('Résoudre')).toBeDefined();
      expect(screen.getByText('Modifier')).toBeDefined();
    });
  });

  it('filters by resolved status and displays resolved entries without edit/resolve action buttons', async () => {
    vi.mocked(actions.listWaitlistEntriesAction).mockResolvedValue({
      entries: [sampleResolvedEntry],
      total: 1,
    });

    render(<WaitlistManager bootstrap={bootstrap} />);

    const statusOption = screen.getByText('Résolus uniquement');
    const statusSelect = statusOption.closest('select')!;
    fireEvent.change(statusSelect, { target: { value: 'resolved' } });

    await waitFor(() => {
      expect(actions.listWaitlistEntriesAction).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'resolved' })
      );
      expect(screen.getByText('Rendez-vous planifié')).toBeDefined();
      expect(screen.queryByText('Modifier')).toBeNull();
      expect(screen.queryByText('Résoudre')).toBeNull();
    });
  });

  it('opens resolve modal and successfully resolves waitlist entry', async () => {
    vi.mocked(actions.listWaitlistEntriesAction).mockResolvedValue({
      entries: [sampleWaitingEntry],
      total: 1,
    });

    vi.mocked(actions.resolveWaitlistEntryAction).mockResolvedValue({
      ...sampleWaitingEntry,
      status: 'resolved',
      resolutionCode: 'withdrawn',
      resolvedAt: '2026-09-05T09:00:00.000Z',
    });

    render(<WaitlistManager bootstrap={bootstrap} />);

    await waitFor(() => {
      expect(screen.getByText('Résoudre')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Résoudre'));

    expect(screen.getByText(/Résoudre l'inscription de/i)).toBeDefined();

    const option = screen.getByText('Désistement du patient');
    const select = option.closest('select');
    expect(select).not.toBeNull();
    if (select) {
      fireEvent.change(select, { target: { value: 'withdrawn' } });
    }

    fireEvent.click(screen.getByText('Confirmer la résolution'));

    await waitFor(() => {
      expect(actions.resolveWaitlistEntryAction).toHaveBeenCalledWith({
        id: 'wl-1',
        resolutionCode: 'withdrawn',
        resolvedAppointmentId: undefined,
      });
    });
  });
});
