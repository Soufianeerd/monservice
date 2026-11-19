import type { ParamedicalProfessionPack } from './types';

export const WELLNESS_MASSAGE_PACK: ParamedicalProfessionPack = {
  profession: 'wellness_massage',
  label: 'Praticien en massage bien-être',
  shortLabel: 'Massage bien-être',
  clinicalHeaderTitle: 'Fiche de suivi bien-être',
  terminology: {
    customerSingular: 'Client',
    customerPlural: 'Clients',
    appointmentSingular: 'Séance',
    appointmentPlural: 'Séances',
    serviceSingular: 'Massage bien-être',
    servicePlural: 'Massages bien-être',
    assessmentLabel: 'Entretien préalable',
    followUpLabel: 'Séance',
    clinicalRecordHeading: 'Préférences et historique des séances',
  },
  appointmentTypePresets: [
    { id: 'massage.60', name: 'Massage bien-être 1 h', description: 'Séance de relaxation d’une heure.', durationMinutes: 60, bufferBeforeMinutes: 0, bufferAfterMinutes: 15, slotStepMinutes: 15 },
    { id: 'massage.90', name: 'Massage bien-être 1 h 30', description: 'Séance longue de relaxation.', durationMinutes: 90, bufferBeforeMinutes: 0, bufferAfterMinutes: 15, slotStepMinutes: 15 },
  ],
  formTemplatePresets: [
    {
      id: 'massage.intake_form',
      name: 'Entretien préalable',
      kind: 'assessment',
      description: 'Attentes, préférences et précautions signalées par le client.',
      schema: {
        fields: [
          { id: 'attentes', label: 'Attentes du client', type: 'textarea', required: true, placeholder: 'Détente, récupération après l’effort, gestion du stress...' },
          { id: 'preferences', label: 'Préférences', type: 'textarea', required: false, placeholder: 'Pression, zones à privilégier ou à éviter, huiles...' },
          { id: 'precautions', label: 'Précautions signalées', type: 'textarea', required: false, placeholder: 'Points signalés par le client (le massage bien-être n’est pas un soin médical)...' },
        ],
      },
    },
    {
      id: 'massage.session_form',
      name: 'Séance',
      kind: 'follow_up',
      description: 'Déroulé et ressenti de la séance.',
      schema: {
        fields: [
          { id: 'deroule', label: 'Déroulé de la séance', type: 'textarea', required: true, placeholder: 'Techniques, zones travaillées, durée...' },
          { id: 'ressenti', label: 'Ressenti du client (1-5)', type: 'scale', min: 1, max: 5, step: 1, required: false },
        ],
      },
    },
  ],
  measurementPresets: [
    { code: 'relaxation_scale', label: 'Détente ressentie (0-10)', valueType: 'numeric', unit: null, description: 'Niveau de détente déclaré par le client après la séance, de 0 à 10.' },
  ],
};
