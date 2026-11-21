import type { ParamedicalProfessionPack } from './types';

export const SPORT_COACH_PACK: ParamedicalProfessionPack = {
  profession: 'sport_coach',
  label: 'Coach sportif & bien-être',
  shortLabel: 'Coach',
  clinicalHeaderTitle: 'Suivi d’accompagnement',
  terminology: {
    customerSingular: 'Client',
    customerPlural: 'Clients',
    appointmentSingular: 'Séance',
    appointmentPlural: 'Séances',
    serviceSingular: 'Séance de coaching',
    servicePlural: 'Séances de coaching',
    assessmentLabel: 'Bilan de départ',
    followUpLabel: 'Point d’étape',
    clinicalRecordHeading: 'Suivi des séances et des objectifs',
  },
  appointmentTypePresets: [
    { id: 'coach.initial_assessment', name: 'Bilan de départ', description: 'Objectifs, niveau actuel, contraintes et disponibilités.', durationMinutes: 60, bufferBeforeMinutes: 0, bufferAfterMinutes: 15, slotStepMinutes: 15 },
    { id: 'coach.session', name: 'Séance de coaching', description: 'Séance individuelle d’entraînement ou d’accompagnement.', durationMinutes: 60, bufferBeforeMinutes: 0, bufferAfterMinutes: 15, slotStepMinutes: 15 },
  ],
  formTemplatePresets: [
    {
      id: 'coach.initial_assessment_form',
      name: 'Bilan de départ',
      kind: 'assessment',
      description: 'Objectifs, niveau de pratique et contraintes déclarées.',
      schema: {
        fields: [
          { id: 'objectifs', label: 'Objectifs', type: 'textarea', required: true, placeholder: 'Remise en forme, préparation d’une course, mobilité, gestion du stress...' },
          { id: 'pratique', label: 'Pratique actuelle', type: 'textarea', required: false, placeholder: 'Activités, fréquence, niveau...' },
          { id: 'contraintes', label: 'Contraintes et disponibilités', type: 'textarea', required: false, placeholder: 'Horaires, matériel, limitations signalées par le client...' },
        ],
      },
    },
    {
      id: 'coach.session_form',
      name: 'Point d’étape',
      kind: 'follow_up',
      description: 'Contenu de la séance et progression.',
      schema: {
        fields: [
          { id: 'contenu', label: 'Contenu de la séance', type: 'textarea', required: true, placeholder: 'Exercices, durées, intensité...' },
          { id: 'ressenti', label: 'Ressenti du client (1-5)', type: 'scale', min: 1, max: 5, step: 1, required: false },
          { id: 'prochaine_etape', label: 'Prochaine étape', type: 'textarea', required: false, placeholder: 'Programme à suivre d’ici la prochaine séance...' },
        ],
      },
    },
  ],
  measurementPresets: [
    { code: 'weight', label: 'Poids', valueType: 'numeric', unit: 'kg', description: 'Poids déclaré ou mesuré en séance.' },
    { code: 'height', label: 'Taille', valueType: 'numeric', unit: 'cm', description: 'Taille en centimètres (pour l’IMC).' },
    { code: 'waist_circumference', label: 'Tour de taille', valueType: 'numeric', unit: 'cm', description: 'Tour de taille en centimètres.' },
    { code: 'resting_heart_rate', label: 'Fréquence cardiaque au repos', valueType: 'numeric', unit: 'bpm', description: 'Pulsations par minute au repos.' },
  ],
};
