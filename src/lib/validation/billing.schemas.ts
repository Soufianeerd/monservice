import { z } from 'zod';

export const quoteLineInputSchema = z
  .object({
    id: z.string().optional(),
    sectionId: z.string().nullable().optional(),
    sectionIndex: z.number().int().min(0).optional(),
    productId: z.string().nullable().optional(),
    description: z.string().min(1, 'La description est requise'),
    lineType: z
      .enum(['service', 'labor', 'material', 'equipment', 'travel', 'subcontracting', 'other'])
      .default('service'),
    unitCode: z
      .enum([
        'unit',
        'hour',
        'day',
        'meter',
        'linear_meter',
        'square_meter',
        'cubic_meter',
        'kilogram',
        'liter',
        'package',
        'fixed_price',
      ])
      .default('unit'),
    position: z.number().int().min(0).default(0),
    quantity: z.number().positive('La quantité doit être supérieure à 0'),
    unitPrice: z.number().min(0, 'Le prix unitaire doit être positif ou nul'),
    discountRate: z.number().min(0).max(100).default(0),
    unitCost: z.number().min(0).nullable().optional(),
    taxRate: z.number().min(0).max(100).default(20),
  })
  .strict();

export const quoteSectionInputSchema = z
  .object({
    id: z.string().optional(),
    parentSectionId: z.string().nullable().optional(),
    kind: z.enum(['lot', 'tranche', 'section', 'option', 'variant']).default('section'),
    title: z.string().min(1, 'Le titre de la section est requis'),
    description: z.string().nullable().optional(),
    position: z.number().int().min(0).default(0),
    isOptional: z.boolean().default(false),
    optionGroupKey: z.string().nullable().optional(),
    isSelected: z.boolean().default(true),
  })
  .strict();

export const createQuoteSchema = z
  .object({
    clientId: z.string().min(1, 'Le client est requis'),
    siteId: z.string().nullable().optional(),
    dealId: z.string().nullable().optional(),
    title: z.string().optional(),
    date: z.string().optional(),
    validUntil: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
    depositMode: z.enum(['none', 'percentage', 'fixed']).default('none'),
    depositRate: z.number().min(0).max(100).nullable().optional(),
    depositFixedAmount: z.number().min(0).nullable().optional(),
    sections: z.array(quoteSectionInputSchema).default([]),
    lines: z.array(quoteLineInputSchema).min(1, 'Au moins une ligne est requise'),
  })
  .strict();

export const updateDraftQuoteSchema = z
  .object({
    id: z.string().min(1),
    clientId: z.string().min(1, 'Le client est requis').optional(),
    siteId: z.string().nullable().optional(),
    dealId: z.string().nullable().optional(),
    title: z.string().optional(),
    date: z.string().optional(),
    validUntil: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
    depositMode: z.enum(['none', 'percentage', 'fixed']).optional(),
    depositRate: z.number().min(0).max(100).nullable().optional(),
    depositFixedAmount: z.number().min(0).nullable().optional(),
    sections: z.array(quoteSectionInputSchema).optional(),
    lines: z.array(quoteLineInputSchema).min(1, 'Au moins une ligne est requise').optional(),
  })
  .strict();

export const sendQuoteSchema = z
  .object({
    quoteId: z.string().min(1, 'Identifiant du devis requis'),
  })
  .strict();

export const markQuoteViewedSchema = z
  .object({
    quoteId: z.string().min(1, 'Identifiant du devis requis'),
  })
  .strict();

export const acceptQuoteSchema = z
  .object({
    quoteId: z.string().min(1, 'Identifiant du devis requis'),
    signatureData: z.string().min(1, 'Signature requise'),
  })
  .strict();

export const rejectQuoteSchema = z
  .object({
    quoteId: z.string().min(1, 'Identifiant du devis requis'),
    reason: z.string().nullable().optional(),
  })
  .strict();

export const createQuoteRevisionSchema = z
  .object({
    quoteId: z.string().min(1, 'Identifiant du devis requis'),
  })
  .strict();

export const createDepositInvoiceSchema = z
  .object({
    quoteId: z.string().min(1, 'Identifiant du devis requis'),
    dueDate: z.string().nullable().optional(),
  })
  .strict();

export const convertQuoteToInvoiceSchema = z
  .object({
    quoteId: z.string().min(1, 'Identifiant du devis requis'),
    dueDate: z.string().nullable().optional(),
  })
  .strict();

export const createWorkOrderFromQuoteSchema = z
  .object({
    quoteId: z.string().min(1, 'Identifiant du devis requis'),
    scheduledStart: z.string().nullable().optional(),
    scheduledEnd: z.string().nullable().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    workType: z
      .enum(['job', 'intervention', 'installation', 'maintenance', 'repair', 'inspection', 'project', 'other'])
      .default('intervention'),
    allowUnpaidDeposit: z.boolean().default(false),
  })
  .strict();

export type QuoteLineInput = z.input<typeof quoteLineInputSchema>;
export type QuoteSectionInput = z.input<typeof quoteSectionInputSchema>;
export type CreateQuoteInput = z.input<typeof createQuoteSchema>;
export type UpdateDraftQuoteInput = z.input<typeof updateDraftQuoteSchema>;
export type SendQuoteInput = z.input<typeof sendQuoteSchema>;
export type MarkQuoteViewedInput = z.input<typeof markQuoteViewedSchema>;
export type AcceptQuoteInput = z.input<typeof acceptQuoteSchema>;
export type RejectQuoteInput = z.input<typeof rejectQuoteSchema>;
export type CreateQuoteRevisionInput = z.input<typeof createQuoteRevisionSchema>;
export type CreateDepositInvoiceInput = z.input<typeof createDepositInvoiceSchema>;
export type ConvertQuoteToInvoiceInput = z.input<typeof convertQuoteToInvoiceSchema>;
export type CreateWorkOrderFromQuoteInput = z.input<typeof createWorkOrderFromQuoteSchema>;
