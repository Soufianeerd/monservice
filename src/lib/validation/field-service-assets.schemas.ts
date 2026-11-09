import { z } from 'zod';
import {
  FIELD_SERVICE_ASSET_CATEGORIES,
  FIELD_SERVICE_ASSET_STATUSES,
} from '@/lib/workspaces/field-service/assets';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date au format AAAA-MM-JJ requise')
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()), 'Date invalide');

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .nullable()
    .optional()
    .transform((value) => (value ? value : null));

const assetFields = {
  siteId: z.string().min(1).nullable().optional(),
  category: z.enum(FIELD_SERVICE_ASSET_CATEGORIES),
  label: z.string().trim().min(1, 'Libellé obligatoire').max(160, '160 caractères maximum'),
  manufacturer: optionalText(120),
  model: optionalText(120),
  serialNumber: optionalText(120),
  installedOn: isoDate.nullable().optional(),
  warrantyEndsOn: isoDate.nullable().optional(),
  notes: optionalText(4000),
};

function checkWarrantyDates(
  value: { installedOn?: string | null; warrantyEndsOn?: string | null },
  ctx: z.RefinementCtx,
) {
  if (value.installedOn && value.warrantyEndsOn && value.warrantyEndsOn < value.installedOn) {
    ctx.addIssue({
      code: 'custom',
      message: 'La fin de garantie ne peut pas précéder la mise en service',
      path: ['warrantyEndsOn'],
    });
  }
}

export const createFieldServiceAssetSchema = z
  .object({ clientId: z.string().min(1, 'Client obligatoire'), ...assetFields })
  .strict()
  .superRefine(checkWarrantyDates);

export const updateFieldServiceAssetSchema = z
  .object({
    id: z.string().min(1),
    siteId: assetFields.siteId,
    category: assetFields.category.optional(),
    label: assetFields.label.optional(),
    manufacturer: assetFields.manufacturer,
    model: assetFields.model,
    serialNumber: assetFields.serialNumber,
    installedOn: assetFields.installedOn,
    warrantyEndsOn: assetFields.warrantyEndsOn,
    notes: assetFields.notes,
    status: z.enum(FIELD_SERVICE_ASSET_STATUSES).optional(),
  })
  .strict()
  .superRefine(checkWarrantyDates);

export const listFieldServiceAssetsSchema = z
  .object({
    clientId: z.string().min(1).optional(),
    siteId: z.string().min(1).optional(),
    status: z.enum(FIELD_SERVICE_ASSET_STATUSES).optional(),
    category: z.enum(FIELD_SERVICE_ASSET_CATEGORIES).optional(),
    search: z.string().trim().max(120).optional(),
  })
  .strict();

export const workOrderAssetLinkSchema = z
  .object({
    workOrderId: z.string().min(1),
    assetId: z.string().min(1),
  })
  .strict();

export type CreateFieldServiceAssetInput = z.infer<typeof createFieldServiceAssetSchema>;
export type UpdateFieldServiceAssetInput = z.infer<typeof updateFieldServiceAssetSchema>;
export type ListFieldServiceAssetsInput = z.infer<typeof listFieldServiceAssetsSchema>;
