import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as sessionModule from '@/lib/auth/session';
import * as organizationModule from '@/lib/services/organization.service';
import type { Organization } from '@/lib/data/interfaces/organization.interface';
import ParametresLayout from '@/app/(dashboard)/parametres/layout';
import { notFound } from 'next/navigation';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/lib/auth/session', () => ({
  requireProfessional: vi.fn(),
}));

vi.mock('@/lib/services/organization.service', () => ({
  organizationService: {
    getById: vi.fn(),
  },
}));

vi.mock('@/components/ui/Tabs', () => ({
  Tabs: ({ tabs }: { tabs: Array<{ name: string; href: string }> }) => (
    <nav data-testid="settings-tabs">
      {tabs.map((tab) => (
        <a key={tab.href} href={tab.href}>
          {tab.name}
        </a>
      ))}
    </nav>
  ),
}));

describe('ParametresLayout Server Component', () => {
  const mockOrgId = 'org-settings-123';
  const mockContext = {
    userId: 'user-1',
    organizationId: mockOrgId,
    profileType: 'professional' as const,
    email: 'pro@test.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sessionModule.requireProfessional).mockResolvedValue(mockContext);
  });

  it('Generic organization: tabs do NOT contain Cabinet', async () => {
    const genericOrg: Organization = {
      id: mockOrgId,
      name: 'Generic Org',
      industry: 'IT',
      sector: 'generic',
      profession: null,
      country: 'FR',
      isPublic: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    vi.mocked(organizationModule.organizationService.getById).mockResolvedValue(genericOrg);

    const jsx = await ParametresLayout({ children: <div data-testid="child-content" /> });
    render(jsx);

    expect(screen.queryByText('Cabinet')).toBeNull();
    expect(screen.getByText('Profil')).toBeDefined();
    expect(screen.getByText('Organisation')).toBeDefined();
  });

  it('Paramedical organization (health + physiotherapist): tabs contain Cabinet', async () => {
    const paramedOrg: Organization = {
      id: mockOrgId,
      name: 'Cabinet Médical',
      industry: 'Health',
      sector: 'health',
      profession: 'physiotherapist',
      country: 'FR',
      isPublic: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    vi.mocked(organizationModule.organizationService.getById).mockResolvedValue(paramedOrg);

    const jsx = await ParametresLayout({ children: <div data-testid="child-content" /> });
    render(jsx);

    expect(screen.getByText('Cabinet')).toBeDefined();
    expect(screen.getByText('Profil')).toBeDefined();
    expect(screen.getByText('Organisation')).toBeDefined();
  });

  it('Missing organization: calls notFound()', async () => {
    vi.mocked(organizationModule.organizationService.getById).mockResolvedValue(null);

    await expect(
      ParametresLayout({ children: <div data-testid="child-content" /> })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });
});
