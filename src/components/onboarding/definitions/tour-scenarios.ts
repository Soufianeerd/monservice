import { TourScenario } from '@/lib/data/interfaces';

export const TOUR_SCENARIOS: Record<string, TourScenario> = {
  discover_dashboard: {
    id: 'discover_dashboard',
    title: 'Découvrez votre tableau de bord',
    steps: [
      {
        id: 'overview',
        route: '/dashboard',
        target: '[data-tour="dashboard-overview"]',
        title: 'Vos revenus',
        content: 'Retrouvez ici les chiffres clés de votre activité en un clin d’œil.',
        placement: 'bottom',
        advanceOn: 'manual-next',
        showNextButton: true,
      },
      {
        id: 'activities',
        route: '/dashboard',
        target: '[data-tour="dashboard-activities"]',
        title: 'Votre activité',
        content: 'Consultez rapidement vos derniers devis et clients ajoutés.',
        placement: 'top',
        advanceOn: 'manual-next',
        showNextButton: true,
      }
    ]
  },
  complete_company_profile: {
    id: 'complete_company_profile',
    title: 'Complétez votre profil entreprise',
    steps: [
      {
        id: 'settings-nav',
        target: '[data-tour="settings-nav"]',
        title: 'Paramètres',
        content: 'Rendez-vous dans vos paramètres pour compléter vos informations.',
        placement: 'right',
        advanceOn: 'target-click',
      },
      {
        id: 'company-form',
        route: '/parametres/organisation',
        target: '[data-tour="company-form"]',
        title: 'Votre profil',
        content: 'Remplissez vos informations légales, votre SIRET et votre logo.',
        placement: 'left',
        advanceOn: 'manual-next',
        showNextButton: true,
      }
    ]
  },
  add_client: {
    id: 'add_client',
    title: 'Créez votre premier client',
    steps: [
      {
        id: 'clients-nav',
        target: '[data-tour="clients-nav"]',
        title: 'Clients',
        content: 'Accédez à votre répertoire de clients.',
        placement: 'right',
        advanceOn: 'target-click',
      },
      {
        id: 'create-client-btn',
        route: '/clients',
        target: '[data-tour="create-client-btn"]',
        title: 'Nouveau client',
        content: 'Cliquez ici pour ajouter votre premier client.',
        placement: 'bottom',
        advanceOn: 'target-click',
      },
      {
        id: 'client-form-name',
        route: '/clients/new',
        target: '[data-tour="client-form-name"]',
        title: 'Nom du client',
        content: 'Indiquez le nom de l’entreprise ou de la personne.',
        placement: 'right',
        advanceOn: 'manual-next',
        showNextButton: true,
      },
      {
        id: 'client-form-submit',
        route: '/clients/new',
        target: '[data-tour="client-form-submit"]',
        title: 'Enregistrez',
        content: 'Une fois les informations renseignées, enregistrez votre client.',
        placement: 'top',
        advanceOn: 'entity-created',
      }
    ]
  },
  complete_profile: {
    id: 'complete_profile',
    title: 'Complétez votre profil',
    steps: [
      {
        id: 'profile-nav',
        target: '[data-tour="profile-nav"]',
        title: 'Profil',
        content: 'Accédez à votre profil pour le compléter.',
        placement: 'right',
        advanceOn: 'target-click',
      },
      {
        id: 'profile-form',
        route: '/client/profile',
        target: '[data-tour="profile-form"]',
        title: 'Informations',
        content: 'Remplissez vos coordonnées pour faciliter le contact avec les prestataires.',
        placement: 'left',
        advanceOn: 'manual-next',
        showNextButton: true,
      }
    ]
  },
  post_request: {
    id: 'post_request',
    title: 'Publiez votre première demande',
    steps: [
      {
        id: 'requests-nav',
        target: '[data-tour="requests-nav"]',
        title: 'Mes demandes',
        content: 'Accédez à la gestion de vos demandes.',
        placement: 'right',
        advanceOn: 'target-click',
      },
      {
        id: 'new-request-btn',
        route: '/client/requests',
        target: '[data-tour="new-request-btn"]',
        title: 'Nouvelle demande',
        content: 'Cliquez ici pour créer votre première demande.',
        placement: 'bottom',
        advanceOn: 'target-click',
      },
      {
        id: 'request-form-title',
        route: '/client/requests/new',
        target: '[data-tour="request-form-title"]',
        title: 'Titre de la demande',
        content: 'Donnez un titre clair à votre besoin.',
        placement: 'right',
        advanceOn: 'manual-next',
        showNextButton: true,
      },
      {
        id: 'request-form-submit',
        route: '/client/requests/new',
        target: '[data-tour="request-form-submit"]',
        title: 'Publier',
        content: 'Une fois renseignée, publiez votre demande pour recevoir des devis.',
        placement: 'top',
        advanceOn: 'entity-created',
      }
    ]
  }
};
