import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listPatientsAction,
  createPatientAction,
  setPatientActiveAction,
} from '@/app/actions/patient-registry.actions';
import { requireProfessional } from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';
import { patientRegistryService } from '@/lib/services/patient-registry.service';
import { revalidatePath } from 'next/cache';
import type { Organization } from '@/lib/data/interfaces/organization.interface';

vi.mock('@/lib/auth/session', () => ({
  requireProfessional: vi.fn(),
}));

vi.mock('@/lib/services/organization.service', () => ({
  organizationService: {
    getById: vi.fn(),
  },
}));

vi.mock('@/lib/services/patient-registry.service', () => ({
  patientRegistryService: {
    listPatients: vi.fn(),
    getPatientDetail: vi.fn(),
    createPatient: vi.fn(),
    updatePatient: vi.fn(),
    setPatientActive: vi.fn(),
    createRepresentativeAndLink: vi.fn(),
    linkRepresentative: vi.fn(),
    updateRepresentative: vi.fn(),
    updateRepresentativeLink: vi.fn(),
    setRepresentativeLinkActive: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Patient Registry Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOrgArtisan: Organization = {
    id: 'org-artisan',
    name: 'Artisan Org',
    industry: 'Artisanat',
    sector: 'artisan',
    country: 'FR',
    isPublic: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  const mockOrgHealthKine: Organization = {
    id: 'org-health',
    name: 'Cabinet Kiné',
    industry: 'Health',
    sector: 'health',
    profession: 'physiotherapist',
    country: 'FR',
    isPublic: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  const mockOrgHealthOsteo: Organization = {
    id: 'org-health',
    name: 'Cabinet Ostéo',
    industry: 'Health',
    sector: 'health',
    profession: 'osteopath',
    country: 'FR',
    isPublic: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  it('rejects call if organization is not paramedical', async () => {
    vi.mocked(requireProfessional).mockResolvedValue({
      userId: 'user-1',
      organizationId: 'org-artisan',
      profileType: 'professional',
      email: 'pro@artisan.fr',
    });

    vi.mocked(organizationService.getById).mockResolvedValue(mockOrgArtisan);

    await expect(listPatientsAction({})).rejects.toThrow(
      'Cette action est réservée au workspace paramédical'
    );
  });

  it('rejects call if organization is missing', async () => {
    vi.mocked(requireProfessional).mockResolvedValue({
      userId: 'user-1',
      organizationId: 'org-missing',
      profileType: 'professional',
      email: 'pro@missing.fr',
    });

    vi.mocked(organizationService.getById).mockResolvedValue(null);

    await expect(listPatientsAction({})).rejects.toThrow('Organization introuvable');
  });

  it('allows listPatientsAction for paramedical workspace', async () => {
    vi.mocked(requireProfessional).mockResolvedValue({
      userId: 'user-1',
      organizationId: 'org-health',
      profileType: 'professional',
      email: 'pro@kine.fr',
    });

    vi.mocked(organizationService.getById).mockResolvedValue(mockOrgHealthKine);

    const mockResult = {
      rows: [],
      total: 0,
      limit: 25,
      offset: 0,
    };
    vi.mocked(patientRegistryService.listPatients).mockResolvedValue(mockResult);

    const res = await listPatientsAction({ birthName: 'Dupont' });
    expect(res).toEqual(mockResult);
    expect(patientRegistryService.listPatients).toHaveBeenCalledWith('org-health', {
      birthName: 'Dupont',
      firstName: null,
      birthDate: null,
      active: 'active',
      limit: 25,
      offset: 0,
    });
  });

  it('executes createPatientAction and calls revalidatePath', async () => {
    vi.mocked(requireProfessional).mockResolvedValue({
      userId: 'user-1',
      organizationId: 'org-health',
      profileType: 'professional',
      email: 'pro@kine.fr',
    });

    vi.mocked(organizationService.getById).mockResolvedValue(mockOrgHealthOsteo);

    const createdPatient = {
      id: 'patient-123',
      birthName: 'DUPONT',
      firstBirthName: 'Alice',
      birthFirstNames: null,
      usedName: null,
      usedFirstName: null,
      birthDate: '1990-05-15',
      sex: 'female' as const,
      birthPlace: null,
      birthPlaceCode: null,
      birthCountry: null,
      email: null,
      phone: null,
      address: null,
      city: null,
      postalCode: null,
      country: null,
      isActive: true,
    };

    vi.mocked(patientRegistryService.createPatient).mockResolvedValue(createdPatient);

    const res = await createPatientAction({
      birthName: 'DUPONT',
      firstBirthName: 'Alice',
      birthDate: '1990-05-15',
      sex: 'female',
    });

    expect(res).toEqual(createdPatient);
    expect(revalidatePath).toHaveBeenCalledWith('/patients');
  });

  it('executes setPatientActiveAction and revalidates list and detail', async () => {
    vi.mocked(requireProfessional).mockResolvedValue({
      userId: 'user-1',
      organizationId: 'org-health',
      profileType: 'professional',
      email: 'pro@kine.fr',
    });

    vi.mocked(organizationService.getById).mockResolvedValue(mockOrgHealthOsteo);

    const updatedPatient = {
      id: 'patient-123',
      birthName: 'DUPONT',
      firstBirthName: 'Alice',
      birthFirstNames: null,
      usedName: null,
      usedFirstName: null,
      birthDate: '1990-05-15',
      sex: 'female' as const,
      birthPlace: null,
      birthPlaceCode: null,
      birthCountry: null,
      email: null,
      phone: null,
      address: null,
      city: null,
      postalCode: null,
      country: null,
      isActive: false,
    };

    vi.mocked(patientRegistryService.setPatientActive).mockResolvedValue(updatedPatient);

    const res = await setPatientActiveAction('patient-123', false);
    expect(res.isActive).toBe(false);
    expect(revalidatePath).toHaveBeenCalledWith('/patients');
    expect(revalidatePath).toHaveBeenCalledWith('/patients/patient-123');
  });
});
