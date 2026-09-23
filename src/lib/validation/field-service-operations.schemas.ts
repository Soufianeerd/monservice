import { z } from 'zod';

export const WORK_ORDER_TYPES = [
  'job',
  'intervention',
  'installation',
  'maintenance',
  'repair',
  'inspection',
  'project',
  'other',
] as const;

export const WORK_ORDER_STATUSES = [
  'draft',
  'scheduled',
  'in_progress',
  'paused',
  'completed',
  'cancelled',
] as const;

export const WORK_ORDER_PRIORITIES = [
  'low',
  'medium',
  'high',
  'urgent',
] as const;

export const WORK_ORDER_CANCELLATION_REASONS = [
  'customer_request',
  'unavailable',
  'duplicate',
  'quote_not_accepted',
  'scheduling_issue',
  'technical_impossibility',
  'other',
] as const;

export const WORK_ORDER_ASSIGNMENT_ROLES = [
  'lead',
  'technician',
  'assistant',
  'observer',
] as const;

export const WORK_REPORT_STATUSES = [
  'draft',
  'finalized',
] as const;

export const createFieldServiceSiteSchema = z.object({
  clientId: z.string().min(1, 'Client ID obligatoire'),
  label: z.string().trim().min(1, 'Libellé obligatoire').max(160, '160 caractères maximum'),
  addressLine1: z.string().trim().min(1, 'Adresse obligatoire').max(255),
  addressLine2: z.string().trim().max(255).nullable().optional(),
  postalCode: z.string().trim().min(1, 'Code postal obligatoire').max(20),
  city: z.string().trim().min(1, 'Ville obligatoire').max(100),
  country: z.string().trim().regex(/^[A-Z]{2}$/, 'Code pays ISO 2 lettres majuscules requis').default('FR'),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  accessInstructions: z.string().trim().max(1000).nullable().optional(),
}).strict();

export const updateFieldServiceSiteSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(160).optional(),
  addressLine1: z.string().trim().min(1).max(255).optional(),
  addressLine2: z.string().trim().max(255).nullable().optional(),
  postalCode: z.string().trim().min(1).max(20).optional(),
  city: z.string().trim().min(1).max(100).optional(),
  country: z.string().trim().regex(/^[A-Z]{2}$/).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  accessInstructions: z.string().trim().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
}).strict();

export const createFieldServiceWorkOrderSchema = z.object({
  clientId: z.string().min(1, 'Client ID obligatoire'),
  siteId: z.string().nullable().optional(),
  title: z.string().trim().min(1, 'Titre obligatoire').max(200, '200 caractères maximum'),
  description: z.string().trim().max(5000).nullable().optional(),
  workType: z.enum(WORK_ORDER_TYPES).default('intervention'),
  priority: z.enum(WORK_ORDER_PRIORITIES).default('medium'),
  scheduledStart: z.string().nullable().optional(),
  scheduledEnd: z.string().nullable().optional(),
}).strict().superRefine((val, ctx) => {
  if (val.scheduledStart && val.scheduledEnd) {
    const start = new Date(val.scheduledStart).getTime();
    const end = new Date(val.scheduledEnd).getTime();
    if (isNaN(start) || isNaN(end)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Dates de planification invalides',
      });
    } else if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fin planifiée doit être postérieure au début planifié',
        path: ['scheduledEnd'],
      });
    }
  }
});

export const updateFieldServiceWorkOrderSchema = z.object({
  id: z.string().min(1),
  siteId: z.string().nullable().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  workType: z.enum(WORK_ORDER_TYPES).optional(),
  priority: z.enum(WORK_ORDER_PRIORITIES).optional(),
  scheduledStart: z.string().nullable().optional(),
  scheduledEnd: z.string().nullable().optional(),
}).strict().superRefine((val, ctx) => {
  if (val.scheduledStart && val.scheduledEnd) {
    const start = new Date(val.scheduledStart).getTime();
    const end = new Date(val.scheduledEnd).getTime();
    if (isNaN(start) || isNaN(end)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Dates de planification invalides',
      });
    } else if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fin planifiée doit être postérieure au début planifié',
        path: ['scheduledEnd'],
      });
    }
  }
});

export const scheduleFieldServiceWorkOrderSchema = z.object({
  id: z.string().min(1),
  scheduledStart: z.string().min(1, 'Date de début requise'),
  scheduledEnd: z.string().min(1, 'Date de fin requise'),
}).strict().superRefine((val, ctx) => {
  const start = new Date(val.scheduledStart).getTime();
  const end = new Date(val.scheduledEnd).getTime();
  if (isNaN(start) || isNaN(end)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Dates de planification invalides',
    });
  } else if (end <= start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La fin planifiée doit être postérieure au début planifié',
      path: ['scheduledEnd'],
    });
  }
});

export const transitionFieldServiceWorkOrderSchema = z.object({
  id: z.string().min(1),
  toStatus: z.enum(WORK_ORDER_STATUSES),
  cancellationReasonCode: z.enum(WORK_ORDER_CANCELLATION_REASONS).nullable().optional(),
  cancellationNotes: z.string().trim().max(1000).nullable().optional(),
}).strict().superRefine((val, ctx) => {
  if (val.toStatus === 'cancelled' && !val.cancellationReasonCode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Motif d’annulation requis pour annuler une opération',
      path: ['cancellationReasonCode'],
    });
  }
  if (val.toStatus !== 'cancelled' && val.cancellationReasonCode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le motif d’annulation doit être vide si le statut n’est pas annulé',
      path: ['cancellationReasonCode'],
    });
  }
});

export const assignFieldServiceWorkerSchema = z.object({
  workOrderId: z.string().min(1),
  userId: z.string().min(1, 'Technicien requis'),
  role: z.enum(WORK_ORDER_ASSIGNMENT_ROLES).default('technician'),
}).strict();

export const unassignFieldServiceWorkerSchema = z.object({
  assignmentId: z.string().min(1),
}).strict();

export const createFieldServiceWorkReportSchema = z.object({
  workOrderId: z.string().min(1),
  summary: z.string().trim().min(1, 'Résumé du rapport obligatoire').max(2000, '2000 caractères maximum'),
  workPerformed: z.string().trim().max(5000).nullable().optional(),
  issuesFound: z.string().trim().max(5000).nullable().optional(),
  recommendations: z.string().trim().max(5000).nullable().optional(),
  customerNotes: z.string().trim().max(5000).nullable().optional(),
}).strict();

export const updateFieldServiceWorkReportSchema = z.object({
  id: z.string().min(1),
  summary: z.string().trim().min(1).max(2000).optional(),
  workPerformed: z.string().trim().max(5000).nullable().optional(),
  issuesFound: z.string().trim().max(5000).nullable().optional(),
  recommendations: z.string().trim().max(5000).nullable().optional(),
  customerNotes: z.string().trim().max(5000).nullable().optional(),
}).strict();

export const finalizeFieldServiceWorkReportSchema = z.object({
  id: z.string().min(1),
}).strict();
