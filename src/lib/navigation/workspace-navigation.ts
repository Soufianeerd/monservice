import { WorkspaceConfig } from '@/lib/workspaces/types';

export type NavigationIconKey =
  | 'dashboard'
  | 'users'
  | 'deals'
  | 'operations'
  | 'billing'
  | 'agenda'
  | 'marketplace'
  | 'reviews'
  | 'messages'
  | 'settings';

export type WorkspaceNavSubItem = {
  name: string;
  href: string;
};

export type WorkspaceNavItem = {
  id: string;
  name: string;
  href: string;
  icon: NavigationIconKey;
  dataTour?: string;
  subItems?: readonly WorkspaceNavSubItem[];
};

/**
 * Construit la navigation de la Sidebar pour un professionnel 
 * en fonction de sa configuration Workspace.
 * 
 * Fonction pure, testable, sans dépendance React ou d'icônes.
 */
/** Rubriques qui n'ont de sens qu'avec des comptes clients (fermés en V1). */
const CLIENT_ACCOUNT_ITEMS = new Set(['marketplace', 'messages']);

export function buildProfessionalNavigation(
  workspace: WorkspaceConfig,
  options: { clientAccess?: boolean } = {},
): WorkspaceNavItem[] {
  const items = buildWorkspaceItems(workspace);
  return options.clientAccess === false ? items.filter((item) => !CLIENT_ACCOUNT_ITEMS.has(item.id)) : items;
}

function buildWorkspaceItems(workspace: WorkspaceConfig): WorkspaceNavItem[] {
  // Generic Navigation (Base complète du CRM)
  if (workspace.type === 'generic') {
    return [
      { id: 'dashboard', name: 'Tableau de bord', href: '/dashboard', icon: 'dashboard' },
      { id: 'clients', name: 'Clients', href: '/clients', icon: 'users', dataTour: 'clients-nav' },
      { id: 'deals', name: 'Opportunités', href: '/deals', icon: 'deals' },
      {
        id: 'billing',
        name: 'Facturation',
        href: '/facturation',
        icon: 'billing',
        subItems: [
          { name: 'Factures', href: '/facturation/factures' },
          { name: 'Devis', href: '/facturation/devis' },
          { name: 'Produits', href: '/facturation/produits' },
          { name: 'Trésorerie', href: '/facturation/tresorerie' },
        ],
      },
      { id: 'reviews', name: 'Avis clients', href: '/avis-clients', icon: 'reviews' },
      {
        id: 'agenda',
        name: 'Agenda',
        href: '/agenda',
        icon: 'agenda',
        subItems: [
          { name: 'Calendrier', href: '/agenda/calendrier' },
          { name: 'Tâches', href: '/agenda/taches' },
        ],
      },
      { id: 'marketplace', name: 'Marketplace', href: '/marketplace', icon: 'marketplace' },
      { id: 'messages', name: 'Messagerie', href: '/messages', icon: 'messages' },
      {
        id: 'settings',
        name: 'Paramètres',
        href: '/parametres',
        icon: 'settings',
        dataTour: 'settings-nav',
        subItems: [
          { name: 'Profil', href: '/parametres/profil' },
          { name: 'Organisation', href: '/parametres/organisation' },
          { name: 'Équipe', href: '/parametres/equipe' },
          { name: 'Relances et avis', href: '/parametres/relances' },
          { name: 'Vitrine publique', href: '/parametres/vitrine' },
          { name: 'Abonnement MonService', href: '/parametres/facturation' },
          { name: 'Conformité RGPD', href: '/parametres/privacy' },
          { name: 'Notifications', href: '/parametres/notifications' },
        ],
      },
    ];
  }

  // Paramedical Navigation
  if (workspace.type === 'paramedical') {
    return [
      { id: 'dashboard', name: 'Tableau de bord', href: '/dashboard', icon: 'dashboard' },
      {
        id: 'patients',
        name: workspace.terminology.customerPlural,
        href: '/patients',
        icon: 'users',
        dataTour: 'patients-nav',
      },
      {
        id: 'billing',
        name: `Factures ${workspace.terminology.customerPlural.toLowerCase()}`,
        href: '/facturation',
        icon: 'billing',
        subItems: [
          { name: 'Factures', href: '/facturation/factures' },
          { name: 'Devis', href: '/facturation/devis' },
          { name: 'Prestations et tarifs', href: '/facturation/produits' },
          { name: 'Trésorerie', href: '/facturation/tresorerie' },
        ],
      },
      { id: 'reviews', name: 'Avis', href: '/avis-clients', icon: 'reviews' },
      {
        id: 'agenda',
        name: 'Agenda',
        href: '/agenda',
        icon: 'agenda',
        subItems: [
          { name: 'Rendez-vous', href: '/agenda/calendrier' },
          { name: 'Horaires et absences', href: '/agenda/disponibilites' },
          { name: 'Types de séances', href: '/agenda/types-seances' },
          { name: "Liste d'attente", href: '/agenda/liste-attente' },
          { name: 'Tâches', href: '/agenda/taches' },
          { name: 'Statistiques', href: '/agenda/statistiques' },
        ],
      },
      {
        id: 'settings',
        name: 'Paramètres',
        href: '/parametres',
        icon: 'settings',
        dataTour: 'settings-nav',
        subItems: [
          { name: 'Mon compte', href: '/parametres/profil' },
          { name: workspace.terminology.customerSingular === 'Client' ? 'Coordonnées de l’activité' : 'Coordonnées du cabinet', href: '/parametres/organisation' },
          { name: 'Lieux et équipe', href: '/parametres/cabinet' },
          { name: 'Comptes utilisateurs', href: '/parametres/equipe' },
          { name: 'Relances et avis', href: '/parametres/relances' },
          { name: 'Vitrine publique', href: '/parametres/vitrine' },
          { name: 'Abonnement MonService', href: '/parametres/facturation' },
          { name: 'Conformité RGPD', href: '/parametres/privacy' },
          { name: 'Notifications', href: '/parametres/notifications' },
        ],
      },
    ];
  }

  // Field Service Navigation (BTP, Artisans, Métiers techniques)
  if (workspace.type === 'field_service') {
    return [
      { id: 'dashboard', name: 'Tableau de bord', href: '/dashboard', icon: 'dashboard' },
      {
        id: 'operations',
        name: workspace.terminology.workPlural || 'Opérations',
        href: '/operations',
        icon: 'operations',
        dataTour: 'operations-nav',
        subItems: [
          { name: workspace.terminology.workPlural || 'Opérations', href: '/operations' },
          { name: 'Équipements clients', href: '/operations/equipements' },
        ],
      },
      {
        id: 'clients',
        name: workspace.terminology.customerPlural || 'Clients',
        href: '/clients',
        icon: 'users',
        dataTour: 'clients-nav',
      },
      { id: 'deals', name: 'Commercial', href: '/deals', icon: 'deals' },
      {
        id: 'billing',
        name: 'Facturation',
        href: '/facturation',
        icon: 'billing',
        subItems: [
          { name: 'Devis', href: '/facturation/devis' },
          { name: 'Factures', href: '/facturation/factures' },
          { name: workspace.terminology.servicePlural || 'Catalogue', href: '/facturation/produits' },
          { name: 'Trésorerie', href: '/facturation/tresorerie' },
        ],
      },
      { id: 'reviews', name: 'Avis clients', href: '/avis-clients', icon: 'reviews' },
      {
        id: 'agenda',
        name: 'Planning',
        href: '/agenda',
        icon: 'agenda',
        subItems: [
          { name: 'Calendrier', href: '/agenda/calendrier' },
          { name: 'Tâches', href: '/agenda/taches' },
        ],
      },
      { id: 'messages', name: 'Messagerie', href: '/messages', icon: 'messages' },
      {
        id: 'settings',
        name: 'Paramètres',
        href: '/parametres',
        icon: 'settings',
        dataTour: 'settings-nav',
        subItems: [
          { name: 'Profil', href: '/parametres/profil' },
          { name: 'Organisation', href: '/parametres/organisation' },
          { name: 'Équipe', href: '/parametres/equipe' },
          { name: 'Relances et avis', href: '/parametres/relances' },
          { name: 'Vitrine publique', href: '/parametres/vitrine' },
          { name: 'Abonnement MonService', href: '/parametres/facturation' },
          { name: 'Conformité RGPD', href: '/parametres/privacy' },
          { name: 'Notifications', href: '/parametres/notifications' },
        ],
      },
    ];
  }

  // Fallback sûr (ne devrait jamais être atteint si le resolver est robuste)
  return [
    { id: 'dashboard', name: 'Tableau de bord', href: '/dashboard', icon: 'dashboard' },
  ];
}
