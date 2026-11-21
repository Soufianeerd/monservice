import type { WorkspaceType } from '@/lib/workspaces/types';

export interface HelpWorkflow {
  id: string;
  label: string;
  href: string;
  entry?: string;
  entryText?: string;
}

/** Routes métier réelles. Le guide laisse à l’utilisateur chaque clic et chaque sauvegarde. */
export function getHelpWorkflows(type: WorkspaceType): HelpWorkflow[] {
  const practice = type === 'paramedical';
  return [
    { id: 'organisation', label: practice ? 'Compléter les coordonnées du cabinet' : 'Compléter les coordonnées de mon activité', href: '/parametres/organisation' },
    ...(practice ? [
      { id: 'lieu', label: 'Ajouter un lieu de consultation', href: '/parametres/cabinet', entry: 'Ajouter un lieu' },
      { id: 'praticien', label: 'Ajouter un praticien', href: '/parametres/cabinet', entry: 'Praticiens', entryText: 'Ouvrez Praticiens, puis cliquez sur Ajouter un praticien. Créez aussi votre fiche si vous exercez seul.' },
      { id: 'affectation', label: 'Associer un praticien à ses lieux', href: '/parametres/cabinet', entry: 'Praticiens', entryText: 'Ouvrez Praticiens, puis Affecter lieux sur la fiche du praticien concerné. Cochez ses lieux de consultation et enregistrez.' },
      { id: 'horaires', label: 'Définir les horaires et les absences', href: '/agenda/disponibilites', entry: 'Ajouter des horaires' },
      { id: 'séance', label: 'Créer un type de séance', href: '/agenda/types-seances', entry: 'Nouveau type' },
      { id: 'patient', label: 'Ajouter un patient, champ par champ', href: '/patients/new' },
      { id: 'rendez-vous', label: 'Planifier un rendez-vous', href: '/agenda/calendrier', entry: 'Nouvelle séance' },
      { id: 'attente', label: 'Inscrire un patient en liste d’attente', href: '/agenda/liste-attente', entry: 'Ajouter' },
      { id: 'facture-patient', label: 'Créer une facture pour un patient', href: '/facturation/factures/new' },
      { id: 'facture-patient-rapide', label: 'Émettre une facture rapide depuis un dossier patient', href: '/patients', entryText: 'Ouvrez le dossier du patient, puis Factures & Règlements. Vous saisirez la prestation, le montant et l’échéance avant d’émettre sa facture.' },
    ] : [
      { id: 'client', label: 'Ajouter un client, champ par champ', href: '/clients/new' },
      { id: 'opportunité', label: 'Créer une opportunité commerciale', href: '/deals/new' },
      ...(type === 'field_service' ? [{ id: 'intervention', label: 'Créer et planifier une intervention', href: '/operations/nouveau' }] : []),
      { id: 'planning', label: 'Utiliser le calendrier', href: '/agenda/calendrier' },
      { id: 'facture', label: 'Créer une facture client', href: '/facturation/factures/new' },
    ]),
    { id: 'prestation', label: 'Créer une prestation et son tarif', href: '/facturation/produits/new' },
    { id: 'devis', label: 'Créer un devis, ligne par ligne', href: '/facturation/devis/nouveau' },
    { id: 'tâche', label: 'Créer une tâche et son échéance', href: '/agenda/taches/new' },
  ];
}

export const GUIDE_SAVED_EVENT = 'monservice:guide-saved';

/** Émis uniquement APRÈS une réponse métier réussie, sans identifiant ni donnée personnelle. */
export function announceGuideSaved(label: string, continueWorkflow = false) {
  window.dispatchEvent(new CustomEvent(GUIDE_SAVED_EVENT, { detail: { label, continueWorkflow } }));
}
