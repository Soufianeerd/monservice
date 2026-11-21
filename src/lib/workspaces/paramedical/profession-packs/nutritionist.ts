import type { ParamedicalProfessionPack } from './types';

export const NUTRITIONIST_PACK: ParamedicalProfessionPack = {
  profession: 'nutritionist',
  label: 'Nutritionniste',
  clinicalHeaderTitle: 'Dossier de suivi nutritionnel',
  terminology: {
    customerSingular: 'Client',
    customerPlural: 'Clients',
    appointmentSingular: 'Consultation',
    appointmentPlural: 'Consultations',
    serviceSingular: 'Consultation nutrition',
    servicePlural: 'Consultations nutrition',
    assessmentLabel: 'Bilan nutritionnel',
    followUpLabel: 'Consultation de suivi',
    clinicalRecordHeading: 'Suivi nutritionnel',
  },
  appointmentTypePresets: [
    { id: 'nutri.initial', name: 'Bilan nutritionnel', description: 'Habitudes alimentaires, mode de vie et objectifs.', durationMinutes: 60, bufferBeforeMinutes: 5, bufferAfterMinutes: 5, slotStepMinutes: 15 },
    { id: 'nutri.follow_up', name: 'Consultation de suivi', description: 'Ajustement des objectifs et des habitudes.', durationMinutes: 30, bufferBeforeMinutes: 5, bufferAfterMinutes: 5, slotStepMinutes: 15 },
  ],
  formTemplatePresets: [
    {
      id: 'nutri.initial_form',
      name: 'Bilan nutritionnel',
      kind: 'assessment',
      description: 'Habitudes alimentaires, rythme de vie et objectifs.',
      schema: {
        fields: [
          { id: 'motif', label: 'Motif de la consultation', type: 'textarea', required: true, placeholder: 'Rééquilibrage, performance sportive, énergie, confort digestif...' },
          { id: 'habitudes', label: 'Habitudes alimentaires', type: 'textarea', required: false, placeholder: 'Repas, collations, hydratation, horaires...' },
          { id: 'preferences', label: 'Préférences et contraintes', type: 'textarea', required: false, placeholder: 'Régime, aversions, budget, temps de cuisine...' },
          { id: 'objectifs', label: 'Objectifs convenus', type: 'textarea', required: false, placeholder: 'Objectifs réalistes et étapes...' },
        ],
      },
    },
    {
      id: 'nutri.follow_up_form',
      name: 'Consultation de suivi',
      kind: 'follow_up',
      description: 'Évolution et ajustements.',
      schema: {
        fields: [
          { id: 'evolution', label: 'Évolution depuis la dernière consultation', type: 'textarea', required: true, placeholder: 'Ressenti, énergie, difficultés...' },
          { id: 'adhesion', label: 'Suivi des objectifs (1-5)', type: 'scale', min: 1, max: 5, step: 1, required: false },
          { id: 'ajustements', label: 'Ajustements proposés', type: 'textarea', required: false, placeholder: 'Nouvelles recettes, portions, organisation...' },
        ],
      },
    },
  ],
  measurementPresets: [
    { code: 'weight', label: 'Poids corporel', valueType: 'numeric', unit: 'kg', description: 'Poids en kilogrammes.' },
    { code: 'height', label: 'Taille', valueType: 'numeric', unit: 'cm', description: 'Taille en centimètres.' },
    { code: 'waist_circumference', label: 'Tour de taille', valueType: 'numeric', unit: 'cm', description: 'Tour de taille en centimètres.' },
  ],
};
