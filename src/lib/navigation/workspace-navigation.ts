import { WorkspaceConfig } from '@/lib/workspaces/types';

export type NavigationIconKey =
  | 'dashboard'
  | 'users'
  | 'deals'
  | 'billing'
  | 'agenda'
  | 'marketplace'
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
export function buildProfessionalNavigation(workspace: WorkspaceConfig): WorkspaceNavItem[] {
  // Generic Navigation (Base complète du CRM)
  if (workspace.type === 'generic') {
    return [
      { id: 'dashboard', name: 'Tableau de bord', href: '/dashboard', icon: 'dashboard' },
      { id: 'clients', name: 'Clients', href: '/clients', icon: 'users', dataTour: 'clients-nav' },
      { id: 'deals', name: 'Deals', href: '/deals', icon: 'deals' },
      {
        id: 'billing',
        name: 'Facturation',
        href: '/facturation',
        icon: 'billing',
        subItems: [
          { name: 'Factures', href: '/facturation/factures' },
          { name: 'Devis', href: '/facturation/devis' },
          { name: 'Produits', href: '/facturation/produits' },
        ],
      },
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
          { name: 'Facturation', href: '/parametres/facturation' },
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
        name: 'Facturation',
        href: '/facturation',
        icon: 'billing',
        subItems: [
          { name: 'Factures', href: '/facturation/factures' },
          { name: 'Devis', href: '/facturation/devis' },
          { name: workspace.terminology.servicePlural ?? 'Prestations', href: '/facturation/produits' },
        ],
      },
      {
        id: 'agenda',
        name: 'Agenda',
        href: '/agenda',
        icon: 'agenda',
        subItems: [
          { name: 'Calendrier', href: '/agenda/calendrier' },
          { name: 'Disponibilités', href: '/agenda/disponibilites' },
          { name: 'Types de séances', href: '/agenda/types-seances' },
          { name: "Liste d'attente", href: '/agenda/liste-attente' },
          { name: 'Tâches', href: '/agenda/taches' },
        ],
      },
      {
        id: 'settings',
        name: 'Paramètres',
        href: '/parametres',
        icon: 'settings',
        dataTour: 'settings-nav',
        subItems: [
          { name: 'Profil', href: '/parametres/profil' },
          { name: 'Organisation', href: '/parametres/organisation' },
          { name: 'Cabinet', href: '/parametres/cabinet' },
          { name: 'Facturation', href: '/parametres/facturation' },
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
