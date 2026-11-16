import { beforeEach, describe, expect, it, vi } from 'vitest';
import { preparePatientBillingRecipientAction } from '@/app/actions/patient-billing.actions';
import { requireClinicalPractitionerContext } from '@/lib/clinical/auth';
import { patientRegistryService } from '@/lib/services/patient-registry.service';
import { patientBillingService } from '@/lib/services/patient-billing.service';

vi.mock('@/lib/clinical/auth', () => ({ requireClinicalPractitionerContext: vi.fn() }));
vi.mock('@/lib/patient-portal/auth', () => ({ requirePatientPortalAccess: vi.fn() }));
vi.mock('@/lib/services/patient-registry.service', () => ({ patientRegistryService: { getPatientById: vi.fn() } }));
vi.mock('@/lib/services/patient-billing.service', () => ({ patientBillingService: { ensurePatientBillingClient: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireClinicalPractitionerContext).mockResolvedValue({ organizationId: 'cabinet-a', practitionerId: 'praticien-a', userId: 'user-a' } as never);
  vi.mocked(patientRegistryService.getPatientById).mockResolvedValue({ id: 'patient-a', isActive: true } as never);
  vi.mocked(patientBillingService.ensurePatientBillingClient).mockResolvedValue({ clientId: 'billing-client-a', isNew: true });
});

describe('Destinataire administratif d’un document patient', () => {
  it('dérive le cabinet de la session et renvoie uniquement l’identifiant administratif', async () => {
    await expect(preparePatientBillingRecipientAction('patient-a')).resolves.toBe('billing-client-a');
    expect(patientRegistryService.getPatientById).toHaveBeenCalledWith('cabinet-a', 'patient-a');
    expect(patientBillingService.ensurePatientBillingClient).toHaveBeenCalledWith('cabinet-a', 'patient-a');
  });
  it('refuse un utilisateur sans contexte clinique actif avant toute lecture ou écriture', async () => {
    vi.mocked(requireClinicalPractitionerContext).mockRejectedValue(new Error('Forbidden'));
    await expect(preparePatientBillingRecipientAction('patient-a')).rejects.toThrow('Forbidden');
    expect(patientRegistryService.getPatientById).not.toHaveBeenCalled();
    expect(patientBillingService.ensurePatientBillingClient).not.toHaveBeenCalled();
  });
  it.each([null, { id: 'archived-patient', isActive: false }])('refuse un patient absent du cabinet ou archivé (%s)', async result => {
    vi.mocked(patientRegistryService.getPatientById).mockResolvedValue(result as never);
    await expect(preparePatientBillingRecipientAction('patient-other')).rejects.toThrow('introuvable ou archivé');
    expect(patientBillingService.ensurePatientBillingClient).not.toHaveBeenCalled();
  });
  it('refuse un objet contenant une organisation ou un identifiant client imposé', async () => {
    await expect(preparePatientBillingRecipientAction({ patientId: 'patient-a', organizationId: 'cabinet-b', clientId: 'client-b' })).rejects.toThrow();
    expect(patientRegistryService.getPatientById).not.toHaveBeenCalled();
    expect(patientBillingService.ensurePatientBillingClient).not.toHaveBeenCalled();
  });
});
