import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as sessionModule from '@/lib/auth/session';
import * as organizationModule from '@/lib/services/organization.service';
import { practiceStructureService } from '@/lib/services/practice-structure.service';
import type { Organization } from '@/lib/data/interfaces/organization.interface';
import CabinetPage from '@/app/(dashboard)/parametres/cabinet/page';
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

vi.mock('@/lib/services/practice-structure.service', () => ({
  practiceStructureService: {
    getOverview: vi.fn(),
  },
}));

vi.mock('@/components/practice/PracticeStructureManager', () => ({
  PracticeStructureManager: () => <div data-testid="practice-structure-manager" />,
}));

describe('Cabinet Page Server Component Resolution', () => {
  const mockOrgId = 'org-paramed-123';
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

  it('CabinetPage calls notFound() if organization is not paramedical workspace', async () => {
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

    await expect(CabinetPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('CabinetPage loads overview and renders if organization is paramedical', async () => {
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

    vi.mocked(practiceStructureService.getOverview).mockResolvedValue({
      locations: [],
      practitioners: [],
      assignments: [],
      rooms: [],
      resources: [],
      eligibleUsers: [],
    });

    const result = await CabinetPage();
    expect(practiceStructureService.getOverview).toHaveBeenCalledWith(mockOrgId);
    expect(result).toBeDefined();
  });
});
