import { ActivityLog } from '../interfaces';

export const activityLogsFixture: ActivityLog[] = [
  {
    id: 'log-1',
    organizationId: 'org-1',
    userId: 'user-1',
    action: 'CREATE',
    entityType: 'CLIENT',
    entityId: 'client-1',
    details: 'Création du client Acme Corp',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'log-2',
    organizationId: 'org-1',
    userId: 'user-1',
    action: 'UPDATE',
    entityType: 'DEAL',
    entityId: 'deal-1',
    details: 'Changement de statut du deal Acme Corp (Gagné)',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'log-3',
    organizationId: 'org-1',
    userId: 'user-1',
    action: 'CREATE',
    entityType: 'INVOICE',
    entityId: 'inv-1',
    details: 'Création de la facture F-2026-0001',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  }
];
