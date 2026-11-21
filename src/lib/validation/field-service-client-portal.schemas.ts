import { z } from 'zod';

export const acknowledgeWorkReportSchema = z
  .object({
    workReportId: z.string().min(1),
    signerName: z.string().trim().min(2, 'Indiquez votre nom (2 caractères minimum)').max(120, '120 caractères maximum'),
    decision: z.enum(['accepted', 'accepted_with_reservations']),
    comment: z
      .string()
      .trim()
      .max(2000, '2000 caractères maximum')
      .nullable()
      .optional()
      .transform((value) => (value ? value : null)),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.decision === 'accepted_with_reservations' && (!value.comment || value.comment.length < 3)) {
      ctx.addIssue({ code: 'custom', path: ['comment'], message: 'Décrivez vos réserves (3 caractères minimum)' });
    }
  });

export type AcknowledgeWorkReportInput = z.infer<typeof acknowledgeWorkReportSchema>;
