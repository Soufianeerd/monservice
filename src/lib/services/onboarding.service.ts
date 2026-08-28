import { OnboardingStep } from '@/lib/data/interfaces';
import { OnboardingContext } from '@/lib/onboarding/types';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import { PARAMEDICAL_PROFESSIONS, ParamedicalProfessionCode } from '@/lib/workspaces/paramedical/professions';

export function getOnboardingSteps(context: OnboardingContext): OnboardingStep[] {
  if (context.profileType === 'client') {
    return [
      { id: 1, title: 'Bienvenue sur MonService !', description: 'Nous allons vous guider à travers les fonctionnalités clés.', action: 'welcome', completed: false, required: false },
      { id: 2, title: 'Découvrez votre tableau de bord', description: 'Consultez vos indicateurs en un coup d’œil.', tooltip: 'Le tableau de bord affiche vos chiffres clés.', action: 'discover_dashboard', link: '/client/dashboard', completed: false, required: false },
      { id: 3, title: 'Complétez votre profil', description: 'Ajoutez vos informations personnelles', action: 'complete_profile', link: '/client/profile', completed: false, required: true },
      { id: 4, title: 'Publiez votre première demande', description: 'Décrivez votre projet et recevez des devis', action: 'post_request', link: '/client/requests/new', completed: false, required: false },
      { id: 5, title: 'Regardez ce tutoriel', description: 'Apprenez à utiliser la plateforme rapidement.', tooltip: 'Vidéo courte de 2 minutes', videoUrl: 'https://example.com/video', action: 'watch_tutorial', completed: false, required: false },
    ];
  } else {
    // Professional
    const workspace = resolveWorkspace({ sector: context.sector, profession: context.profession });
    
    if (workspace.type === 'paramedical') {
       // Paramedical plan
       const isKnownProfession = context.profession && PARAMEDICAL_PROFESSIONS[context.profession as ParamedicalProfessionCode];
       const label = isKnownProfession 
         ? `Configurez votre activité de ${PARAMEDICAL_PROFESSIONS[context.profession as ParamedicalProfessionCode].label}.` 
         : "Ajoutez vos coordonnées, votre adresse professionnelle et les informations utiles de votre structure.";

       return [
         { id: 1, title: 'Bienvenue sur MonService !', description: 'Nous allons vous guider à travers les fonctionnalités clés.', action: 'welcome', completed: false, required: false },
         { id: 2, title: 'Découvrez votre tableau de bord', description: 'Consultez vos indicateurs en un coup d’œil.', tooltip: 'Le tableau de bord affiche vos chiffres clés.', action: 'discover_dashboard', link: '/dashboard', completed: false, required: false },
         { id: 3, title: 'Complétez les informations de votre activité', description: label, action: 'complete_company_profile', link: '/parametres/organisation', completed: false, required: true },
       ];
    }

    // Generic Professional
    const baseSteps: OnboardingStep[] = [
      { id: 1, title: 'Bienvenue sur MonService !', description: 'Nous allons vous guider à travers les fonctionnalités clés.', action: 'welcome', completed: false, required: false },
      { id: 2, title: 'Découvrez votre tableau de bord', description: 'Consultez vos indicateurs en un coup d’œil.', tooltip: 'Le tableau de bord affiche vos chiffres clés.', action: 'discover_dashboard', link: '/dashboard', completed: false, required: false },
      { id: 3, title: 'Complétez votre profil entreprise', description: 'Ajoutez votre logo, coordonnées et informations légales', action: 'complete_company_profile', link: '/parametres/organisation', completed: false, required: true },
      { id: 4, title: 'Créez votre premier client', description: 'Ajoutez un client pour commencer à gérer votre relation', action: 'add_client', link: '/clients/new', tooltip: 'Essentiel pour facturer', completed: false, required: false },
      { id: 5, title: 'Regardez ce tutoriel', description: 'Apprenez à créer vos devis et factures.', tooltip: 'Tutoriel pour les pros', videoUrl: 'https://example.com/pro-video', action: 'watch_tutorial', completed: false, required: false },
    ];
    // Ajouter des étapes spécifiques selon le secteur
    if (context.sector === 'artisan' || context.sector === 'building') {
      baseSteps.push({
        id: 6, // Fix duplicate ID (was 5)
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
