import { WorkspaceCapability } from '../types';

/**
 * Capacités actives et réellement implémentées dans MonSERVICE pour Field Service.
 */
export const FIELD_SERVICE_IMPLEMENTED_CAPABILITIES = [
  'clients',
  'deals',
  'quotes',
  'invoices',
  'products',
  'calendar',
  'tasks',
  'messaging',
  'billing',
] as const satisfies readonly WorkspaceCapability[];

/**
 * Capacités planifiées (Roadmap Sessions 17+) — Ne doivent PAS apparaître en UI active Session 16.
 */
export const FIELD_SERVICE_PLANNED_CAPABILITIES = [
  'jobs',
  'interventions',
  'workOrders',
  'repairCases',
  'customerAssets',
  'jobPhases',
  'jobMilestones',
  'fieldReports',
  'photoEvidence',
  'customerSignatures',
  'timeTracking',
  'teams',
  'skills',
  'subcontractors',
  'inventory',
  'materials',
  'parts',
  'suppliers',
  'purchases',
  'purchaseOrders',
  'vehicles',
  'equipment',
  'recurringContracts',
  'maintenancePlans',
  'warranties',
  'afterSales',
  'customerPortal',
  'profitability',
  'maps',
  'routePlanning',
  'electronicInvoicing',
  'reviews',
  'marketingAutomation',
  'workflowAutomation',
  'aiAssistant',
] as const;

export type FieldServicePlannedCapability = typeof FIELD_SERVICE_PLANNED_CAPABILITIES[number];

/**
 * Capacités actives déployées pour Field Service.
 */
export const FIELD_SERVICE_CAPABILITIES = FIELD_SERVICE_IMPLEMENTED_CAPABILITIES;
