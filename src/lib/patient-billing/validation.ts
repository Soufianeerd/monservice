import { z } from 'zod';

export const patientInvoiceLineInputSchema = z.object({
  description: z.string().min(1, 'Description requise').max(255),
  quantity: z.number().positive('Quantité positive requise'),
  unitPrice: z.number().nonnegative('Prix unitaire positif ou nul'),
  vatRate: z.number().min(0).max(100),
});

export const createPatientInvoiceSchema = z.object({
  patientId: z.string().min(1, 'Identifiant patient requis'),
  dueDate: z.string().min(10, 'Date d’échéance requise'),
  lines: z.array(patientInvoiceLineInputSchema).min(1, 'Au moins une ligne de facturation requise'),
  notes: z.string().max(1000).optional(),
});
