import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as sessionModule from '@/lib/auth/session';
import * as organizationModule from '@/lib/services/organization.service';
import { practiceStructureService } from '@/lib/services/practice-structure.service';
import type { Organization } from '@/lib/data/interfaces/organization.interface';
import {
  createPracticeLocationAction,
  updatePracticeLocationAction,
  setPrimaryPracticeLocationAction,
  setPracticeLocationActiveAction,
  createPracticePractitionerAction,
  setPractitionerLocationsAction,
  createPracticeRoomAction,
  createPracticeResourceAction,
} from '@/app/actions/practice-structure.actions';
import { revalidatePath } from 'next/cache';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
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
    createLocation: vi.fn(),
    updateLocation: vi.fn(),
    setPrimaryLocation: vi.fn(),
    setLocationActive: vi.fn(),
    createPractitioner: vi.fn(),
    updatePractitioner: vi.fn(),
    setPractitionerActive: vi.fn(),
    setPractitionerLocations: vi.fn(),
    createRoom: vi.fn(),
    updateRoom: vi.fn(),
    setRoomActive: vi.fn(),
    createResource: vi.fn(),
    updateResource: vi.fn(),
    setResourceActive: vi.fn(),
  },
}));

describe('Practice Structure Server Actions', () => {
  const mockOrgId = 'org-paramed-123';
  const dummyLocId = '10000000-0000-4000-8000-000000000001';
  const dummyPracId = '10000000-0000-4000-8000-000000000002';
  const dummyRoomId = '10000000-0000-4000-8000-000000000003';
  const dummyResId = '10000000-0000-4000-8000-000000000004';

  const mockContext = {
    userId: 'user-1',
    organizationId: mockOrgId,
    profileType: 'professional' as const,
    email: 'pro@test.com',
  };

  const mockOrg: Organization = {
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sessionModule.requireProfessional).mockResolvedValue(mockContext);
    vi.mocked(organizationModule.organizationService.getById).mockResolvedValue(mockOrg);
  });

  it('rejects action when organization is missing (not found)', async () => {
    vi.mocked(organizationModule.organizationService.getById).mockResolvedValue(null);

    await expect(createPracticeLocationAction({
      name: 'Test',
      timezone: 'Europe/Paris',
    })).rejects.toThrow(/Organization introuvable/);
    expect(practiceStructureService.createLocation).not.toHaveBeenCalled();
  });

  it('rejects action when organization is not paramedical workspace', async () => {
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

    await expect(createPracticeLocationAction({
      name: 'Test',
      timezone: 'Europe/Paris',
    })).rejects.toThrow(/réservée au workspace paramédical/);
    expect(practiceStructureService.createLocation).not.toHaveBeenCalled();
  });

  describe('Location Actions', () => {
    it('createPracticeLocationAction calls service and revalidates path', async () => {
      vi.mocked(practiceStructureService.createLocation).mockResolvedValue({
        id: dummyLocId,
        name: 'Cabinet Paris',
        address: null,
        city: null,
        postalCode: null,
        country: null,
        timezone: 'Europe/Paris',
        phone: null,
        isPrimary: true,
        isActive: true,
      });

      const result = await createPracticeLocationAction({
        name: 'Cabinet Paris',
        timezone: 'Europe/Paris',
      });

      expect(practiceStructureService.createLocation).toHaveBeenCalledWith(mockOrgId, expect.objectContaining({
        name: 'Cabinet Paris',
        timezone: 'Europe/Paris',
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/parametres/cabinet');
      expect(result).toEqual(expect.objectContaining({ id: dummyLocId }));
    });

    it('updatePracticeLocationAction calls service and revalidates', async () => {
      vi.mocked(practiceStructureService.updateLocation).mockResolvedValue({
        id: dummyLocId,
        name: 'Updated',
        address: null,
        city: null,
        postalCode: null,
        country: null,
        timezone: 'Europe/Paris',
        phone: null,
        isPrimary: true,
        isActive: true,
      });

      const result = await updatePracticeLocationAction(dummyLocId, { name: 'Updated' });
      expect(practiceStructureService.updateLocation).toHaveBeenCalledWith(mockOrgId, dummyLocId, expect.objectContaining({ name: 'Updated' }));
      expect(revalidatePath).toHaveBeenCalledWith('/parametres/cabinet');
      expect(result.name).toBe('Updated');
    });

    it('setPrimaryPracticeLocationAction calls service and revalidates', async () => {
      vi.mocked(practiceStructureService.setPrimaryLocation).mockResolvedValue();

      await setPrimaryPracticeLocationAction(dummyLocId);
      expect(practiceStructureService.setPrimaryLocation).toHaveBeenCalledWith(mockOrgId, dummyLocId);
      expect(revalidatePath).toHaveBeenCalledWith('/parametres/cabinet');
    });

    it('setPracticeLocationActiveAction calls service and revalidates', async () => {
      vi.mocked(practiceStructureService.setLocationActive).mockResolvedValue();

      await setPracticeLocationActiveAction(dummyLocId, false);
      expect(practiceStructureService.setLocationActive).toHaveBeenCalledWith(mockOrgId, dummyLocId, false);
      expect(revalidatePath).toHaveBeenCalledWith('/parametres/cabinet');
    });
  });

  describe('Practitioner Actions', () => {
    it('createPracticePractitionerAction validates and calls service', async () => {
      vi.mocked(practiceStructureService.createPractitioner).mockResolvedValue({
        id: dummyPracId,
        userId: null,
        displayName: 'Dr. Martin',
        profession: 'physiotherapist',
        email: null,
        phone: null,
        isActive: true,
      });

      const payload = {
        displayName: 'Dr. Martin',
        profession: 'physiotherapist' as const,
      };
      await createPracticePractitionerAction(payload);
      expect(practiceStructureService.createPractitioner).toHaveBeenCalledWith(mockOrgId, expect.objectContaining(payload));
      expect(revalidatePath).toHaveBeenCalledWith('/parametres/cabinet');
    });

    it('setPractitionerLocationsAction validates and calls service', async () => {
      vi.mocked(practiceStructureService.setPractitionerLocations).mockResolvedValue();

      await setPractitionerLocationsAction(dummyPracId, [
        { locationId: dummyLocId, isPrimary: true },
      ]);
      expect(practiceStructureService.setPractitionerLocations).toHaveBeenCalledWith(mockOrgId, dummyPracId, [
        { locationId: dummyLocId, isPrimary: true },
      ]);
      expect(revalidatePath).toHaveBeenCalledWith('/parametres/cabinet');
    });
  });

  describe('Room and Resource Actions', () => {
    it('createPracticeRoomAction calls service and revalidates', async () => {
      vi.mocked(practiceStructureService.createRoom).mockResolvedValue({
        id: dummyRoomId,
        locationId: dummyLocId,
        name: 'Salle 1',
        description: null,
        isActive: true,
      });

      await createPracticeRoomAction({
        locationId: dummyLocId,
        name: 'Salle 1',
      });
      expect(practiceStructureService.createRoom).toHaveBeenCalledWith(mockOrgId, expect.objectContaining({
        locationId: dummyLocId,
        name: 'Salle 1',
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/parametres/cabinet');
    });

    it('createPracticeResourceAction calls service and revalidates', async () => {
      vi.mocked(practiceStructureService.createResource).mockResolvedValue({
        id: dummyResId,
        locationId: dummyLocId,
        roomId: null,
        name: 'Laser',
        description: null,
        isActive: true,
      });

      await createPracticeResourceAction({
        locationId: dummyLocId,
        name: 'Laser',
      });
      expect(practiceStructureService.createResource).toHaveBeenCalledWith(mockOrgId, expect.objectContaining({
        locationId: dummyLocId,
        name: 'Laser',
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/parametres/cabinet');
    });
  });
});
