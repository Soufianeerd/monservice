import { ProfileType, OnboardingStep } from '@/lib/data/interfaces';

export function getOnboardingSteps(profileType: ProfileType, sector?: string): OnboardingStep[] {
  if (profileType === 'client') {
    return [
      { id: 1, title: 'Bienvenue sur MonService !', description: 'Nous allons vous guider à travers les fonctionnalités clés.', action: 'welcome', completed: false, required: true },
      { id: 2, title: 'Découvrez votre tableau de bord', description: 'Consultez vos indicateurs en un coup d’œil.', tooltip: 'Le tableau de bord affiche vos chiffres clés.', action: 'discover_dashboard', link: '/client/dashboard', completed: false, required: false },
      { id: 3, title: 'Complétez votre profil', description: 'Ajoutez vos informations personnelles', action: 'complete_profile', link: '/client/profile', completed: false, required: true },
      { id: 4, title: 'Publiez votre première demande', description: 'Décrivez votre projet et recevez des devis', action: 'post_request', link: '/client/requests/new', completed: false, required: false },
      { id: 5, title: 'Regardez ce tutoriel', description: 'Apprenez à utiliser la plateforme rapidement.', tooltip: 'Vidéo courte de 2 minutes', videoUrl: 'https://example.com/video', action: 'watch_tutorial', completed: false, required: false },
    ];
  } else {
    // Professionnel
    const baseSteps: OnboardingStep[] = [
      { id: 1, title: 'Bienvenue sur MonService !', description: 'Nous allons vous guider à travers les fonctionnalités clés.', action: 'welcome', completed: false, required: true },
      { id: 2, title: 'Découvrez votre tableau de bord', description: 'Consultez vos indicateurs en un coup d’œil.', tooltip: 'Le tableau de bord affiche vos chiffres clés.', action: 'discover_dashboard', link: '/dashboard', completed: false, required: false },
      { id: 3, title: 'Complétez votre profil entreprise', description: 'Ajoutez votre logo, coordonnées et informations légales', action: 'complete_company_profile', link: '/parametres/organisation', completed: false, required: true },
      { id: 4, title: 'Créez votre premier client', description: 'Ajoutez un client pour commencer à gérer votre relation', action: 'add_client', link: '/clients/new', tooltip: 'Essentiel pour facturer', completed: false, required: false },
      { id: 5, title: 'Regardez ce tutoriel', description: 'Apprenez à créer vos devis et factures.', tooltip: 'Tutoriel pour les pros', videoUrl: 'https://example.com/pro-video', action: 'watch_tutorial', completed: false, required: false },
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
