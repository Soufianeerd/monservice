import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CalendarPage from '@/app/(dashboard)/agenda/calendrier/page';
import * as sessionModule from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';
import { schedulingService } from '@/lib/services/scheduling.service';
import { getEventsAction } from '@/app/actions/calendar.actions';

vi.mock('@/lib/auth/session', () => ({
  requireProfessional: vi.fn(),
}));

vi.mock('@/lib/services/organization.service', () => ({
  organizationService: {
    getById: vi.fn(),
  },
}));

vi.mock('@/lib/services/scheduling.service', () => ({
  schedulingService: {
    getSchedulingBootstrap: vi.fn(),
  },
}));

vi.mock('@/app/actions/calendar.actions', () => ({
  getEventsAction: vi.fn(),
}));

vi.mock('@/components/crm/CalendarView', () => ({
  default: () => <div data-testid="crm-calendar-view">CRM Calendar</div>,
}));

vi.mock('@/components/scheduling/ParamedicalCalendar', () => ({
  ParamedicalCalendar: () => <div data-testid="paramedical-calendar-view">Paramedical Calendar</div>,
}));

describe('Calendar Page Workspace Branching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders CRM Calendar for Generic workspace', async () => {
    vi.mocked(sessionModule.requireProfessional).mockResolvedValue({
      userId: 'user-1',
      organizationId: 'org-generic',
      email: 'user@test.fr',
      profileType: 'professional',
    });

    vi.mocked(organizationService.getById).mockResolvedValue({
      id: 'org-generic',
      name: 'Generic Business',
      slug: 'generic',
      sector: 'general',
      profession: null,
      industry: 'services',
      isPublic: true,
      country: 'FR',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    });

    vi.mocked(getEventsAction).mockResolvedValue([
      {
        id: '1',
        title: 'Tâche CRM',
        start: '2026-09-04T10:00:00Z',
        allDay: false,
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        extendedProps: { type: 'task', status: 'pending', originalId: 'task-1' },
      },
    ]);

    const jsx = await CalendarPage();
    render(jsx);

    expect(screen.getByTestId('crm-calendar-view')).toBeDefined();
    expect(screen.queryByTestId('paramedical-calendar-view')).toBeNull();
  });

  it('renders Paramedical Calendar for Paramedical workspace', async () => {
    vi.mocked(sessionModule.requireProfessional).mockResolvedValue({
      userId: 'user-pro',
      organizationId: 'org-paramedical',
      email: 'user@test.fr',
      profileType: 'professional',
    });

    vi.mocked(organizationService.getById).mockResolvedValue({
      id: 'org-paramedical',
      name: 'Cabinet Paramédical',
      slug: 'cabinet-paramedical',
      sector: 'health',
      profession: 'physiotherapist',
      industry: 'health',
      isPublic: true,
      country: 'FR',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    });

    vi.mocked(schedulingService.getSchedulingBootstrap).mockResolvedValue({
      locations: [],
      practitioners: [],
      rooms: [],
      appointmentTypes: [],
    });

    const jsx = await CalendarPage();
    render(jsx);

    expect(screen.getByTestId('paramedical-calendar-view')).toBeDefined();
    expect(screen.queryByTestId('crm-calendar-view')).toBeNull();
  });
});
