import type { ParamedicalProfessionPack } from './types';

export const PSYCHOLOGIST_PACK: ParamedicalProfessionPack = {
  profession: 'psychologist',
  label: 'Psychologue',
  clinicalHeaderTitle: 'Dossier de suivi psychologique',
  terminology: {
    customerSingular: 'Patient',
    customerPlural: 'Patients',
    appointmentSingular: 'Séance',
    appointmentPlural: 'Séances',
    serviceSingular: 'Séance de psychologie',
    servicePlural: 'Séances de psychologie',
    assessmentLabel: 'Premier entretien',
    followUpLabel: 'Séance de suivi',
    clinicalRecordHeading: 'Notes de suivi psychologique',
  },
  appointmentTypePresets: [
    { id: 'psy.first_session', name: 'Premier entretien', description: 'Accueil de la demande, contexte et cadre du suivi.', durationMinutes: 60, bufferBeforeMinutes: 0, bufferAfterMinutes: 10, slotStepMinutes: 15 },
    { id: 'psy.follow_up', name: 'Séance de suivi', description: 'Séance individuelle de suivi.', durationMinutes: 45, bufferBeforeMinutes: 0, bufferAfterMinutes: 15, slotStepMinutes: 15 },
  ],
  formTemplatePresets: [
    {
      id: 'psy.first_session_form',
      name: 'Premier entretien',
      kind: 'assessment',
      description: 'Trame d’accueil : demande, contexte et objectifs du suivi.',
      schema: {
        fields: [
          { id: 'demande', label: 'Demande exprimée', type: 'textarea', required: true, placeholder: 'Ce qui amène la personne à consulter, avec ses mots...' },
          { id: 'contexte', label: 'Contexte de vie', type: 'textarea', required: false, placeholder: 'Situation familiale, professionnelle, événements récents...' },
          { id: 'objectifs', label: 'Objectifs du suivi', type: 'textarea', required: false, placeholder: 'Ce que la personne souhaite voir évoluer...' },
          { id: 'cadre', label: 'Cadre convenu', type: 'textarea', required: false, placeholder: 'Fréquence, durée, modalités...' },
        ],
      },
    },
    {
      id: 'psy.follow_up_form',
      name: 'Séance de suivi',
      kind: 'follow_up',
      description: 'Notes de séance et pistes de travail.',
      schema: {
        fields: [
          { id: 'themes', label: 'Thèmes abordés', type: 'textarea', required: true, placeholder: 'Principaux thèmes de la séance...' },
          { id: 'evolution', label: 'Évolution perçue (1-5)', type: 'scale', min: 1, max: 5, step: 1, required: false },
          { id: 'pistes', label: 'Pistes pour la prochaine séance', type: 'textarea', required: false, placeholder: 'Points à reprendre, exercices proposés...' },
        ],
      },
    },
  ],
  measurementPresets: [
    { code: 'wellbeing_scale', label: 'Bien-être ressenti (0-10)', valueType: 'numeric', unit: null, description: 'Auto-évaluation du bien-être par le patient, de 0 à 10.' },
  ],
};
