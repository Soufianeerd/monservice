import { describe, it, expect, vi, beforeEach } from 'vitest';
import PatientClinicalPage from '@/app/(dashboard)/patients/[id]/clinique/page';
import { requireClinicalPractitionerContext } from '@/lib/clinical/auth';
import { patientRegistryService } from '@/lib/services/patient-registry.service';
import { clinicalRecordService } from '@/lib/services/clinical-record.service';
import { notFound } from 'next/navigation';

vi.mock('@/lib/clinical/auth', () => ({
  requireClinicalPractitionerContext: vi.fn(),
}));

vi.mock('@/lib/services/patient-registry.service', () => ({
  patientRegistryService: {
    getPatientDetail: vi.fn(),
  },
}));

vi.mock('@/lib/services/clinical-record.service', () => ({
  clinicalRecordService: {
    listCareEpisodes: vi.fn(),
    listClinicalEncounters: vi.fn(),
    listEligibleAppointmentsForEncounter: vi.fn(),
    getPatientClinicalOverview: vi.fn(),
    getPatientClinicalTimeline: vi.fn(),
    listClinicalDocuments: vi.fn(),
    listFormTemplates: vi.fn(),
    listFormResponses: vi.fn(),
    listMeasurements: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/components/clinical/ClinicalRecordManager', () => ({
  default: vi.fn(() => null),
}));

describe('PatientClinicalPage Server Component', () => {
  const mockContext = {
    userId: 'user-pro-1',
    organizationId: 'org-health-1',
    practitionerId: 'practitioner-1',
    email: 'pro@cabinet.fr',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders clinical record manager when user has active clinical practitioner context and patient exists', async () => {
    vi.mocked(requireClinicalPractitionerContext).mockResolvedValue(mockContext);
    vi.mocked(patientRegistryService.getPatientDetail).mockResolvedValue({
      patient: {
        id: 'patient-1',
        birthName: 'DUPONT',
        firstBirthName: 'Alice',
        birthFirstNames: null,
        usedName: null,
        usedFirstName: null,
        birthDate: '1990-01-01',
        sex: 'female',
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
      },
      representatives: [],
    });

    vi.mocked(clinicalRecordService.listCareEpisodes).mockResolvedValue([]);
    vi.mocked(clinicalRecordService.listEligibleAppointmentsForEncounter).mockResolvedValue([]);

    const jsx = await PatientClinicalPage({ params: Promise.resolve({ id: 'patient-1' }) });
    expect(jsx).not.toBeNull();
    expect(clinicalRecordService.listCareEpisodes).toHaveBeenCalledWith(
      'org-health-1',
      'patient-1',
      'practitioner-1',
    );
  });

  it('calls notFound when requireClinicalPractitionerContext rejects (unlinked staff or generic org)', async () => {
    vi.mocked(requireClinicalPractitionerContext).mockRejectedValue(
      new Error('CLINICAL_ACCESS_FORBIDDEN'),
    );

    await expect(
      PatientClinicalPage({ params: Promise.resolve({ id: 'patient-1' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('calls notFound when patient does not exist in organization', async () => {
    vi.mocked(requireClinicalPractitionerContext).mockResolvedValue(mockContext);
    vi.mocked(patientRegistryService.getPatientDetail).mockResolvedValue(null);

    await expect(
      PatientClinicalPage({ params: Promise.resolve({ id: 'patient-missing' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });
});
