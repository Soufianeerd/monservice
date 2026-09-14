import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClinicalFormTemplateFromPresetAction } from '@/app/actions/clinical-record.actions';
import { installParamedicalAppointmentTypePresetAction } from '@/app/actions/scheduling.actions';
import { requireClinicalPractitionerContext } from '@/lib/clinical/auth';
import { requireProfessional } from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';
import { clinicalRecordService } from '@/lib/services/clinical-record.service';
import { schedulingService } from '@/lib/services/scheduling.service';
import { PHYSIOTHERAPIST_PACK } from '@/lib/workspaces/paramedical/profession-packs/physiotherapist';
import { AppError } from '@/lib/errors';
import type { ClinicalFormTemplateDTO } from '@/lib/clinical/types';
import type { AppointmentTypeDTO } from '@/lib/scheduling/types';
import type { Organization } from '@/lib/data/interfaces/organization.interface';

vi.mock('@/lib/clinical/auth', () => ({
  requireClinicalPractitionerContext: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  requireProfessional: vi.fn(),
}));

vi.mock('@/lib/services/organization.service', () => ({
  organizationService: {
    getById: vi.fn(),
  },
}));

vi.mock('@/lib/services/clinical-record.service', () => ({
  clinicalRecordService: {
    listFormTemplates: vi.fn(),
    createFormTemplate: vi.fn(),
    updateFormTemplate: vi.fn(),
  },
}));

vi.mock('@/lib/services/scheduling.service', () => ({
  schedulingService: {
    listAppointmentTypes: vi.fn(),
    createAppointmentType: vi.fn(),
    setAppointmentTypeActive: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Clinical & Scheduling Profession Presets Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createClinicalFormTemplateFromPresetAction', () => {
    const mockPhysioContext = {
      userId: 'user-physio-1',
      organizationId: 'org-physio-1',
      practitionerId: 'practitioner-physio-1',
      email: 'kine@cabinet.fr',
      profession: 'physiotherapist' as const,
      professionPack: PHYSIOTHERAPIST_PACK,
    };

    it('installs a valid form preset matching practitioner profession pack', async () => {
      vi.mocked(requireClinicalPractitionerContext).mockResolvedValue(mockPhysioContext);
      vi.mocked(clinicalRecordService.listFormTemplates).mockResolvedValue([]);

      const mockCreated: ClinicalFormTemplateDTO = {
        id: 'tpl-created-1',
        organizationId: 'org-physio-1',
        practitionerId: 'practitioner-physio-1',
        name: 'Bilan initial kinésithérapique',
        kind: 'assessment',
        description: 'Trame d’évaluation initiale',
        schemaJson: PHYSIOTHERAPIST_PACK.formTemplatePresets[0].schema,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(clinicalRecordService.createFormTemplate).mockResolvedValue(mockCreated);

      const result = await createClinicalFormTemplateFromPresetAction(
        'physio.initial_assessment_form',
      );

      expect(result).toEqual(mockCreated);
      expect(clinicalRecordService.createFormTemplate).toHaveBeenCalledWith(
        'org-physio-1',
        'practitioner-physio-1',
        expect.objectContaining({
          name: 'Bilan initial kinésithérapique',
          kind: 'assessment',
          schemaJson: expect.objectContaining({
            fields: expect.any(Array),
          }),
        }),
      );
    });

    it('rejects cross-profession preset installation with PRESET_NOT_FOUND (e.g. Kiné attempting to install Dietitian preset)', async () => {
      vi.mocked(requireClinicalPractitionerContext).mockResolvedValue(mockPhysioContext);

      await expect(
        createClinicalFormTemplateFromPresetAction('diet.initial_assessment_form'),
      ).rejects.toThrow(AppError);

      await expect(
        createClinicalFormTemplateFromPresetAction('diet.initial_assessment_form'),
      ).rejects.toMatchObject({
        code: 'PRESET_NOT_FOUND',
        statusCode: 400,
      });

      expect(clinicalRecordService.createFormTemplate).not.toHaveBeenCalled();
    });

    it('rejects hostile object payload attempting to inject client authority into form preset action', async () => {
      vi.mocked(requireClinicalPractitionerContext).mockResolvedValue(mockPhysioContext);

      const hostilePayload = {
        presetId: 'physio.initial_assessment_form',
        organizationId: 'org-hacked-victim',
        practitionerId: 'practitioner-hacked-victim',
        profession: 'dietitian',
        schema: { fields: [{ id: 'injected', label: 'Malicious', type: 'text' }] },
      };

      await expect(
        createClinicalFormTemplateFromPresetAction(hostilePayload),
      ).rejects.toMatchObject({
        code: 'INVALID_PRESET_ID',
        statusCode: 400,
      });

      expect(clinicalRecordService.createFormTemplate).not.toHaveBeenCalled();
    });

    it('rejects execution and performs 0 write when user is not an active clinical practitioner', async () => {
      vi.mocked(requireClinicalPractitionerContext).mockRejectedValue(
        new AppError('Profil praticien actif requis', 403, 'CLINICAL_PRACTITIONER_REQUIRED'),
      );

      await expect(
        createClinicalFormTemplateFromPresetAction('physio.initial_assessment_form'),
      ).rejects.toMatchObject({
        code: 'CLINICAL_PRACTITIONER_REQUIRED',
        statusCode: 403,
      });

      expect(clinicalRecordService.createFormTemplate).not.toHaveBeenCalled();
    });

    it('rejects unknown or malformed preset ID', async () => {
      vi.mocked(requireClinicalPractitionerContext).mockResolvedValue(mockPhysioContext);

      await expect(
        createClinicalFormTemplateFromPresetAction('hacker_preset_id'),
      ).rejects.toMatchObject({
        code: 'PRESET_NOT_FOUND',
        statusCode: 400,
      });

      await expect(
        createClinicalFormTemplateFromPresetAction(''),
      ).rejects.toMatchObject({
        code: 'INVALID_PRESET_ID',
        statusCode: 400,
      });

      await expect(
        createClinicalFormTemplateFromPresetAction(null),
      ).rejects.toMatchObject({
        code: 'INVALID_PRESET_ID',
        statusCode: 400,
      });
    });

    it('rejects execution when workspace has no profession pack (generic paramedical or non-health)', async () => {
      vi.mocked(requireClinicalPractitionerContext).mockResolvedValue({
        userId: 'user-generic-1',
        organizationId: 'org-generic-1',
        practitionerId: 'practitioner-generic-1',
        email: 'generic@cabinet.fr',
        profession: undefined,
        professionPack: undefined,
      });

      await expect(
        createClinicalFormTemplateFromPresetAction('physio.initial_assessment_form'),
      ).rejects.toMatchObject({
        code: 'PROFESSION_PACK_REQUIRED',
        statusCode: 403,
      });

      expect(clinicalRecordService.createFormTemplate).not.toHaveBeenCalled();
    });

    it('is idempotent: returns existing template if active template with same name and kind already exists', async () => {
      vi.mocked(requireClinicalPractitionerContext).mockResolvedValue(mockPhysioContext);

      const existingTemplate: ClinicalFormTemplateDTO = {
        id: 'tpl-existing-1',
        organizationId: 'org-physio-1',
        practitionerId: 'practitioner-physio-1',
        name: 'Bilan initial kinésithérapique',
        kind: 'assessment',
        description: 'Trame existante',
        schemaJson: PHYSIOTHERAPIST_PACK.formTemplatePresets[0].schema,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(clinicalRecordService.listFormTemplates).mockResolvedValue([existingTemplate]);

      const result = await createClinicalFormTemplateFromPresetAction(
        'physio.initial_assessment_form',
      );

      expect(result).toEqual(existingTemplate);
      expect(clinicalRecordService.createFormTemplate).not.toHaveBeenCalled();
    });

    it('reactivates inactive template if previously deactivated', async () => {
      vi.mocked(requireClinicalPractitionerContext).mockResolvedValue(mockPhysioContext);

      const inactiveTemplate: ClinicalFormTemplateDTO = {
        id: 'tpl-inactive-1',
        organizationId: 'org-physio-1',
        practitionerId: 'practitioner-physio-1',
        name: 'Bilan initial kinésithérapique',
        kind: 'assessment',
        description: 'Trame existante',
        schemaJson: PHYSIOTHERAPIST_PACK.formTemplatePresets[0].schema,
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const reactivatedTemplate: ClinicalFormTemplateDTO = {
        ...inactiveTemplate,
        isActive: true,
      };

      vi.mocked(clinicalRecordService.listFormTemplates).mockResolvedValue([inactiveTemplate]);
      vi.mocked(clinicalRecordService.updateFormTemplate).mockResolvedValue(reactivatedTemplate);

      const result = await createClinicalFormTemplateFromPresetAction(
        'physio.initial_assessment_form',
      );

      expect(result).toEqual(reactivatedTemplate);
      expect(clinicalRecordService.updateFormTemplate).toHaveBeenCalledWith(
        'org-physio-1',
        'practitioner-physio-1',
        'tpl-inactive-1',
        { isActive: true },
      );
      expect(clinicalRecordService.createFormTemplate).not.toHaveBeenCalled();
    });
  });

  describe('installParamedicalAppointmentTypePresetAction', () => {
    const mockDietitianSession = {
      userId: 'user-diet-1',
      organizationId: 'org-diet-1',
      email: 'diet@cabinet.fr',
      profileType: 'professional' as const,
    };

    const mockDietitianOrg: Organization = {
      id: 'org-diet-1',
      name: 'Cabinet de Nutrition',
      industry: 'Santé',
      sector: 'health',
      profession: 'dietitian',
      country: 'FR',
      isPublic: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('installs a valid appointment type preset for dietitian profession pack', async () => {
      vi.mocked(requireProfessional).mockResolvedValue(mockDietitianSession);
      vi.mocked(organizationService.getById).mockResolvedValue(mockDietitianOrg);
      vi.mocked(schedulingService.listAppointmentTypes).mockResolvedValue([]);

      const mockCreated: AppointmentTypeDTO = {
        id: 'apt-type-1',
        organizationId: 'org-diet-1',
        name: 'Première consultation diététique',
        description: 'Bilan nutritionnel approfondi, enquête alimentaire, analyse des habitudes et objectifs.',
        durationMinutes: 60,
        bufferBeforeMinutes: 5,
        bufferAfterMinutes: 5,
        slotStepMinutes: 15,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(schedulingService.createAppointmentType).mockResolvedValue(mockCreated);

      const result = await installParamedicalAppointmentTypePresetAction('diet.initial_consultation');

      expect(result).toEqual(mockCreated);
      expect(schedulingService.createAppointmentType).toHaveBeenCalledWith(
        'org-diet-1',
        expect.objectContaining({
          name: 'Première consultation diététique',
          durationMinutes: 60,
          bufferBeforeMinutes: 5,
          bufferAfterMinutes: 5,
          slotStepMinutes: 15,
        }),
      );
    });

    it('rejects cross-profession appointment preset with PRESET_NOT_FOUND (Dietitian attempting to install Kiné preset)', async () => {
      vi.mocked(requireProfessional).mockResolvedValue(mockDietitianSession);
      vi.mocked(organizationService.getById).mockResolvedValue(mockDietitianOrg);

      await expect(
        installParamedicalAppointmentTypePresetAction('physio.initial_assessment'),
      ).rejects.toMatchObject({
        code: 'PRESET_NOT_FOUND',
        statusCode: 400,
      });

      expect(schedulingService.createAppointmentType).not.toHaveBeenCalled();
    });

    it('rejects hostile object payload attempting to inject client authority into appointment preset action', async () => {
      vi.mocked(requireProfessional).mockResolvedValue(mockDietitianSession);
      vi.mocked(organizationService.getById).mockResolvedValue(mockDietitianOrg);

      const hostilePayload = {
        presetId: 'diet.initial_consultation',
        organizationId: 'org-hacked-victim',
        profession: 'physiotherapist',
        practitionerId: 'practitioner-hacked',
        durationMinutes: 999,
      };

      await expect(
        installParamedicalAppointmentTypePresetAction(hostilePayload),
      ).rejects.toMatchObject({
        code: 'INVALID_PRESET_ID',
        statusCode: 400,
      });

      expect(schedulingService.createAppointmentType).not.toHaveBeenCalled();
    });

    it('rejects execution and performs 0 write when user is not an authenticated professional (e.g. client or anon)', async () => {
      vi.mocked(requireProfessional).mockRejectedValue(
        new AppError('Accès réservé aux professionnels', 403, 'PROFESSIONAL_REQUIRED'),
      );

      await expect(
        installParamedicalAppointmentTypePresetAction('diet.initial_consultation'),
      ).rejects.toMatchObject({
        code: 'PROFESSIONAL_REQUIRED',
        statusCode: 403,
      });

      expect(schedulingService.createAppointmentType).not.toHaveBeenCalled();
    });

    it('rejects non-paramedical workspace sector', async () => {
      vi.mocked(requireProfessional).mockResolvedValue({
        userId: 'user-artisan-1',
        organizationId: 'org-artisan-1',
        email: 'artisan@pro.fr',
        profileType: 'professional',
      });
      const mockArtisanOrg: Organization = {
        id: 'org-artisan-1',
        name: 'Menuiserie',
        industry: 'Artisanat',
        sector: 'artisan',
        profession: null,
        country: 'FR',
        isPublic: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      vi.mocked(organizationService.getById).mockResolvedValue(mockArtisanOrg);

      await expect(
        installParamedicalAppointmentTypePresetAction('diet.initial_consultation'),
      ).rejects.toMatchObject({
        code: 'PARAMEDICAL_ACCESS_FORBIDDEN',
        statusCode: 403,
      });
    });

    it('is idempotent: returns existing appointment type if matching name and duration already exists', async () => {
      vi.mocked(requireProfessional).mockResolvedValue(mockDietitianSession);
      vi.mocked(organizationService.getById).mockResolvedValue(mockDietitianOrg);

      const existingType: AppointmentTypeDTO = {
        id: 'apt-existing-1',
        organizationId: 'org-diet-1',
        name: 'Première consultation diététique',
        description: 'Bilan nutritionnel existant',
        durationMinutes: 60,
        bufferBeforeMinutes: 5,
        bufferAfterMinutes: 5,
        slotStepMinutes: 15,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(schedulingService.listAppointmentTypes).mockResolvedValue([existingType]);

      const result = await installParamedicalAppointmentTypePresetAction('diet.initial_consultation');

      expect(result).toEqual(existingType);
      expect(schedulingService.createAppointmentType).not.toHaveBeenCalled();
    });
  });
});
