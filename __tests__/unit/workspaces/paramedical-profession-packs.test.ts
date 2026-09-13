import { describe, expect, it } from 'vitest';
import {
  PARAMEDICAL_PROFESSION_CODES,
  ParamedicalProfessionCode,
} from '@/lib/workspaces/paramedical/professions';
import {
  PARAMEDICAL_PROFESSION_PACKS,
  getParamedicalProfessionPack,
  requireParamedicalProfessionPack,
} from '@/lib/workspaces/paramedical/profession-packs/registry';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import { validateFormTemplateSchema } from '@/lib/clinical/forms';
import { MEASUREMENT_CODE_REGEX } from '@/lib/clinical/measurements';
import { appointmentTypeCreateSchema } from '@/lib/scheduling/validation';
import {
  PARAMEDICAL_IMPLEMENTED_CAPABILITIES,
  PARAMEDICAL_FUTURE_CAPABILITIES,
  PARAMEDICAL_CAPABILITIES,
} from '@/lib/workspaces/paramedical/capabilities';
import { WORKSPACE_CAPABILITY_CODES } from '@/lib/workspaces/types';

describe('Paramedical Profession Packs Registry', () => {
  it('contains exactly the 7 canonical profession codes', () => {
    const keys = Object.keys(PARAMEDICAL_PROFESSION_PACKS).sort();
    const expected = [...PARAMEDICAL_PROFESSION_CODES].sort();
    expect(keys).toEqual(expected);
    expect(keys).toHaveLength(7);
  });

  it('every pack matches its canonical profession code and has required fields', () => {
    for (const code of PARAMEDICAL_PROFESSION_CODES) {
      const pack = PARAMEDICAL_PROFESSION_PACKS[code];
      expect(pack.profession).toBe(code);
      expect(pack.label).toBeTruthy();
      expect(pack.clinicalHeaderTitle).toBeTruthy();
      expect(pack.terminology.customerSingular).toBe('Patient');
      expect(pack.terminology.customerPlural).toBe('Patients');
      expect(pack.terminology.appointmentSingular).toBeTruthy();
      expect(pack.terminology.serviceSingular).toBeTruthy();
      expect(pack.terminology.assessmentLabel).toBeTruthy();
      expect(pack.terminology.followUpLabel).toBeTruthy();
      expect(pack.terminology.clinicalRecordHeading).toBeTruthy();
    }
  });

  it('getParamedicalProfessionPack returns the exact pack for valid codes and undefined for invalid', () => {
    for (const code of PARAMEDICAL_PROFESSION_CODES) {
      const pack = getParamedicalProfessionPack(code);
      expect(pack).toBeDefined();
      expect(pack?.profession).toBe(code);
    }

    expect(getParamedicalProfessionPack('surgeon')).toBeUndefined();
    expect(getParamedicalProfessionPack(null)).toBeUndefined();
    expect(getParamedicalProfessionPack(undefined)).toBeUndefined();
    expect(getParamedicalProfessionPack('')).toBeUndefined();
  });

  it('requireParamedicalProfessionPack returns the pack or throws an AppError', () => {
    const pack = requireParamedicalProfessionPack('physiotherapist');
    expect(pack.profession).toBe('physiotherapist');

    expect(() => requireParamedicalProfessionPack('unknown')).toThrow();
    expect(() => requireParamedicalProfessionPack(null)).toThrow();
  });
});

describe('Workspace Resolver with Profession Packs', () => {
  it('resolves workspace with exact profession pack for each of the 7 professions', () => {
    for (const code of PARAMEDICAL_PROFESSION_CODES) {
      const workspace = resolveWorkspace({ sector: 'health', profession: code });
      expect(workspace.type).toBe('paramedical');
      if (workspace.type === 'paramedical') {
        expect(workspace.profession).toBe(code);
        expect(workspace.professionPack).toBeDefined();
        expect(workspace.professionPack?.profession).toBe(code);
        expect(workspace.label).toBe(workspace.professionPack?.label);
      }
    }
  });

  it('falls back to generic paramedical workspace without pack for health sector with unknown or missing profession', () => {
    const wsNoProf = resolveWorkspace({ sector: 'health' });
    expect(wsNoProf.type).toBe('paramedical');
    if (wsNoProf.type === 'paramedical') {
      expect(wsNoProf.profession).toBeUndefined();
      expect(wsNoProf.professionPack).toBeUndefined();
      expect(wsNoProf.label).toBe('Espace Paramédical');
    }

    const wsUnknownProf = resolveWorkspace({ sector: 'health', profession: 'astrologer' });
    expect(wsUnknownProf.type).toBe('paramedical');
    if (wsUnknownProf.type === 'paramedical') {
      expect(wsUnknownProf.profession).toBeUndefined();
      expect(wsUnknownProf.professionPack).toBeUndefined();
      expect(wsUnknownProf.label).toBe('Espace Paramédical');
    }
  });

  it('resolves generic workspace for non-health sector even if profession parameter is provided', () => {
    const wsArtisan = resolveWorkspace({ sector: 'artisan', profession: 'physiotherapist' });
    expect(wsArtisan.type).toBe('generic');
    expect('professionPack' in wsArtisan).toBe(false);
  });
});

describe('Profession Pack Presets Validation', () => {
  const allAppointmentPresetIds = new Set<string>();
  const allFormPresetIds = new Set<string>();

  for (const code of PARAMEDICAL_PROFESSION_CODES) {
    describe(`Profession Pack: ${code}`, () => {
      const pack = PARAMEDICAL_PROFESSION_PACKS[code];

      it('has at least 1 appointment type preset and each preset is valid', () => {
        expect(pack.appointmentTypePresets.length).toBeGreaterThanOrEqual(1);

        for (const preset of pack.appointmentTypePresets) {
          expect(preset.id).toBeTruthy();
          expect(allAppointmentPresetIds.has(preset.id)).toBe(false);
          allAppointmentPresetIds.add(preset.id);

          expect(() =>
            appointmentTypeCreateSchema.parse({
              name: preset.name,
              description: preset.description,
              durationMinutes: preset.durationMinutes,
              bufferBeforeMinutes: preset.bufferBeforeMinutes,
              bufferAfterMinutes: preset.bufferAfterMinutes,
              slotStepMinutes: preset.slotStepMinutes,
            }),
          ).not.toThrow();
        }
      });

      it('has at least 2 clinical form template presets and each schema is strictly valid', () => {
        expect(pack.formTemplatePresets.length).toBeGreaterThanOrEqual(2);

        for (const preset of pack.formTemplatePresets) {
          expect(preset.id).toBeTruthy();
          expect(allFormPresetIds.has(preset.id)).toBe(false);
          allFormPresetIds.add(preset.id);

          expect(preset.name).toBeTruthy();
          expect(['assessment', 'evaluation', 'intake', 'follow_up', 'discharge', 'satisfaction']).toContain(preset.kind);

          const validated = validateFormTemplateSchema(preset.schema);
          expect(validated.fields.length).toBeGreaterThanOrEqual(1);
          expect(validated.fields.length).toBeLessThanOrEqual(100);

          // All field IDs must be unique
          const fieldIds = new Set(validated.fields.map((f) => f.id));
          expect(fieldIds.size).toBe(validated.fields.length);
        }
      });

      it('has measurement presets that strictly respect clinical measurement schema', () => {
        expect(pack.measurementPresets.length).toBeGreaterThanOrEqual(1);

        const measurementCodes = new Set<string>();
        for (const preset of pack.measurementPresets) {
          expect(MEASUREMENT_CODE_REGEX.test(preset.code)).toBe(true);
          expect(measurementCodes.has(preset.code)).toBe(false);
          measurementCodes.add(preset.code);

          expect(preset.label.trim().length).toBeGreaterThanOrEqual(1);
          expect(preset.label.trim().length).toBeLessThanOrEqual(160);
          expect(['numeric', 'text']).toContain(preset.valueType);

          if (preset.unit) {
            expect(preset.unit.length).toBeLessThanOrEqual(40);
          }
        }
      });
    });
  }
});

describe('Workspace Capabilities Partitioning', () => {
  it('implemented capabilities contain all current active modules', () => {
    expect(PARAMEDICAL_IMPLEMENTED_CAPABILITIES).toContain('patients');
    expect(PARAMEDICAL_IMPLEMENTED_CAPABILITIES).toContain('clinicalRecords');
    expect(PARAMEDICAL_IMPLEMENTED_CAPABILITIES).toContain('careEpisodes');
    expect(PARAMEDICAL_IMPLEMENTED_CAPABILITIES).toContain('appointments');
    expect(PARAMEDICAL_IMPLEMENTED_CAPABILITIES).toContain('waitingList');
    expect(PARAMEDICAL_IMPLEMENTED_CAPABILITIES).toContain('clinicalForms');
    expect(PARAMEDICAL_IMPLEMENTED_CAPABILITIES).toContain('measurements');
    expect(PARAMEDICAL_IMPLEMENTED_CAPABILITIES).toContain('billing');
  });

  it('future capabilities are isolated and not included in active PARAMEDICAL_CAPABILITIES', () => {
    for (const futureCap of PARAMEDICAL_FUTURE_CAPABILITIES) {
      expect(PARAMEDICAL_CAPABILITIES).not.toContain(futureCap);
      expect(WORKSPACE_CAPABILITY_CODES).toContain(futureCap);
    }
  });
});
