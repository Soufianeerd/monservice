import type { ParamedicalProfessionCode } from '../professions';
import type { ClinicalFormKind, ClinicalFormTemplateSchema } from '@/lib/clinical/types';

export interface ParamedicalAppointmentTypePreset {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  slotStepMinutes: number;
}

export interface ParamedicalFormTemplatePreset {
  id: string;
  name: string;
  kind: ClinicalFormKind;
  description?: string;
  schema: ClinicalFormTemplateSchema;
}

export interface ParamedicalMeasurementPreset {
  code: string;
  label: string;
  valueType: 'numeric' | 'text';
  unit: string | null;
  description?: string;
}

export interface ParamedicalProfessionTerminology {
  customerSingular: string;
  customerPlural: string;
  appointmentSingular: string;
  appointmentPlural: string;
  serviceSingular: string;
  servicePlural: string;
  assessmentLabel: string;
  followUpLabel: string;
  clinicalRecordHeading: string;
}

export interface ParamedicalProfessionPack {
  profession: ParamedicalProfessionCode;
  label: string;
  shortLabel?: string;
  clinicalHeaderTitle: string;
  terminology: Readonly<ParamedicalProfessionTerminology>;
  appointmentTypePresets: readonly ParamedicalAppointmentTypePreset[];
  formTemplatePresets: readonly ParamedicalFormTemplatePreset[];
  measurementPresets: readonly ParamedicalMeasurementPreset[];
  dashboard?: {
    quickActionNotes?: string;
  };
  clinicalUi?: {
    defaultNotesSnippet?: string;
  };
}
