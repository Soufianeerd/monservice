import { ProfileType, OnboardingStep } from '@/lib/data/interfaces';

export function getOnboardingSteps(profileType: ProfileType, sector?: string): OnboardingStep[] {
  if (profileType === 'client') {
    return [
      { id: 1, title: 'Complétez votre profil', description: 'Ajoutez vos informations personnelles', action: 'complete_profile', link: '/profile', completed: false, required: true },
      { id: 2, title: 'Définissez votre localisation', description: 'Indiquez votre ville et vos préférences', action: 'set_location', link: '/settings', completed: false, required: true },
      { id: 3, title: 'Recherchez un professionnel', description: 'Trouvez le bon prestataire pour vos besoins', action: 'search_professional', link: '/search', completed: false, required: false },
      { id: 4, title: 'Publiez votre première demande', description: 'Décrivez votre projet et recevez des devis', action: 'post_request', link: '/requests/new', completed: false, required: false },
    ];
  } else {
    // Professionnel
    const baseSteps: OnboardingStep[] = [
      { id: 1, title: 'Complétez votre profil entreprise', description: 'Ajoutez votre logo, coordonnées et informations légales', action: 'complete_company_profile', link: '/settings/organization', completed: false, required: true },
      { id: 2, title: 'Créez votre premier client', description: 'Ajoutez un client pour commencer à gérer votre relation', action: 'add_client', link: '/clients/new', completed: false, required: false },
      { id: 3, title: 'Créez votre premier devis', description: 'Générez un devis pour un client', action: 'create_quote', link: '/invoices/new?type=quote', completed: false, required: false },
      { id: 4, title: 'Publiez votre profil public', description: 'Rendez-vous visible sur la marketplace', action: 'publish_profile', link: '/settings/organization?tab=public', completed: false, required: false },
    ];
    // Ajouter des étapes spécifiques selon le secteur
    if (sector === 'artisan' || sector === 'building') {
      baseSteps.push({
        id: 5,
        title: 'Ajoutez vos prestations',
        description: 'Définissez vos services et tarifs',
        action: 'add_services',
        link: '/products/new',
        completed: false,
        required: false,
      });
    }
    return baseSteps;
  }
}
