import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AgendaLayout from '@/app/(dashboard)/agenda/layout';
import * as sessionModule from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';

vi.mock('@/lib/auth/session', () => ({
  requireProfessional: vi.fn(),
}));

vi.mock('@/lib/services/organization.service', () => ({
  organizationService: {
    getById: vi.fn(),
  },
}));

vi.mock('@/components/ui/Tabs', () => ({
  Tabs: ({ tabs }: { tabs: { name: string; href: string }[] }) => (
    <nav data-testid="agenda-tabs">
      {tabs.map((t) => (
        <a key={t.href} href={t.href}>
          {t.name}
        </a>
      ))}
    </nav>
  ),
}));

describe('Agenda Layout Workspace Branching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Generic Agenda tabs (Calendrier, Tâches) without paramedical tabs', async () => {
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

    const jsx = await AgendaLayout({ children: <div>Contenu</div> });
    render(jsx);

    expect(screen.getByText('Calendrier')).toBeDefined();
    expect(screen.getByText('Tâches')).toBeDefined();
    expect(screen.queryByText('Disponibilités')).toBeNull();
    expect(screen.queryByText('Types de séances')).toBeNull();
  });

  it('renders Paramedical Agenda tabs (Calendrier, Disponibilités, Types de séances, Tâches)', async () => {
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

    const jsx = await AgendaLayout({ children: <div>Contenu</div> });
    render(jsx);

    expect(screen.getByText('Calendrier')).toBeDefined();
    expect(screen.getByText('Disponibilités')).toBeDefined();
    expect(screen.getByText('Types de séances')).toBeDefined();
    expect(screen.getByText('Tâches')).toBeDefined();
  });
});
