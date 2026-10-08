import { z } from 'zod';
import { clientSchema as clientForm, contactSchema as contactForm, dealSchema as dealForm } from '@/utils/validation';
import { quoteLineInputSchema } from './billing.schemas';
import { productSchema, taskSchema, invoiceSchema, invoiceLineSchema } from './schemas';

// Stored ownership and lifecycle identities never belong to ordinary forms.
export const clientUpdateSchema = clientForm.extend({ company: z.string().optional(), notes: z.string().optional() }).partial().strict();
export const contactUpdateSchema = contactForm.partial().strict();
export const dealUpdateSchema = dealForm.partial().strict();
export const productUpdateSchema = productSchema.omit({ organizationId: true, type: true, isActive: true }).extend({
  taxRate: productSchema.shape.taxRate.removeDefault(),
}).partial().strict();
export const taskUpdateSchema = taskSchema.omit({ organizationId: true }).extend({
  status: taskSchema.shape.status.removeDefault(),
  priority: taskSchema.shape.priority.removeDefault(),
  assignedTo: z.string().nullable().optional().transform(value => value === '' ? null : value),
  entityId: z.string().nullable().optional().transform(value => value === '' ? null : value),
  entityType: z.enum(['client','contact','deal','invoice','quote']).nullable().optional(),
}).partial().strict();
export const invoiceUpdateSchema = invoiceSchema.omit({ organizationId: true, number: true, type: true, status: true, legalEntityId: true }).extend({
  status: z.enum(['draft','sent','cancelled']).optional(),
  lines: z.array(invoiceLineSchema.extend({ lineType: quoteLineInputSchema.shape.lineType, unitCode: quoteLineInputSchema.shape.unitCode }).strict()).optional(),
}).partial().strict();
export const requestUpdateSchema = z.object({
  title: z.string().min(5).optional(), description: z.string().min(10).optional(),
  category: z.string().min(2).optional(), location: z.string().max(200).optional(),
  budget: z.number().nonnegative().optional(), preferredDate: z.string().optional(),
  status: z.enum(['in_progress','completed','cancelled','draft','published']).optional(),
  isPublic: z.boolean().optional(),
}).strict();
