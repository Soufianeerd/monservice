import { z } from 'zod';

// Client Schema
export const clientSchema = z.object({
  type: z.enum(['individual', 'company']),
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  siret: z.string().optional(),
  vatNumber: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['lead', 'active', 'inactive']).default('lead'),
  organizationId: z.string().min(1, "Organization ID requis")
});

// Contact Schema
export const contactSchema = z.object({
  clientId: z.string().min(1, "Client ID requis"),
  firstName: z.string().min(2, "Le prénom est requis"),
  lastName: z.string().min(2, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  role: z.string().optional(),
  isPrimary: z.boolean().default(false),
  organizationId: z.string().min(1, "Organization ID requis")
});

// Deal Schema
export const dealSchema = z.object({
  name: z.string().min(3, "Le nom est requis"),
  value: z.number().min(0, "La valeur doit être positive"),
  status: z.enum(['prospect', 'proposal', 'negotiation', 'won', 'lost', 'qualification']).default('prospect'),
  probability: z.number().min(0).max(100).default(0),
  clientId: z.string().min(1, "Client ID requis"),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
  organizationId: z.string().min(1, "Organization ID requis")
});

// Product Schema
export const productSchema = z.object({
  name: z.string().min(2, "Le nom est requis"),
  description: z.string().optional(),
  unitPrice: z.number().min(0, "Le prix doit être positif"),
  taxRate: z.number().min(0).max(100).default(20),
  type: z.enum(['service', 'product']).default('service'),
  organizationId: z.string().min(1, "Organization ID requis"),
  isActive: z.boolean().default(true)
});

// Invoice Line Schema
export const invoiceLineSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, "La description est requise"),
  quantity: z.number().min(1, "La quantité doit être d'au moins 1"),
  unitPrice: z.number().min(0, "Le prix unitaire doit être positif"),
  taxRate: z.number().min(0).max(100).default(20),
  discount: z.number().optional()
});

// Invoice Schema
export const invoiceSchema = z.object({
  clientId: z.string().min(1, "Client ID requis"),
  type: z.enum(['invoice', 'quote']),
  number: z.string().optional(), // generated usually
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled', 'pending', 'accepted', 'rejected', 'unpaid', 'viewed']).default('draft'),
  date: z.string(),
  dueDate: z.string().optional(),
  message: z.string().optional(),
  organizationId: z.string().min(1, "Organization ID requis"),
  // Fiscal inputs
  legalEntityId: z.string().nullable().optional(),
  supplierCountry: z.string().nullable().optional(),
  supplierVatId: z.string().nullable().optional(),
  customerCountry: z.string().nullable().optional(),
  customerVatId: z.string().nullable().optional(),
  customerType: z.enum(['B2B', 'B2C']).nullable().optional(),
  productType: z.enum(['goods', 'digital_service', 'physical_service']).nullable().optional(),
  productCategory: z.string().nullable().optional(),
});

// Task Schema
export const taskSchema = z.object({
  title: z.string().min(2, "Le titre est requis"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'todo']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assignedTo: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  organizationId: z.string().min(1, "Organization ID requis")
});

// Request Schema
export const requestSchema = z.object({
  title: z.string().min(5, "Le titre est requis (min 5)"),
  description: z.string().min(10, "La description est requise (min 10)"),
  category: z.string().min(2, "Catégorie requise"),
  budget: z.number().optional(),
  deadline: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled', 'draft', 'published']).default('draft'),
  visibility: z.enum(['public', 'private']).default('public'),
  clientId: z.string().min(1, "Client ID requis")
});

// Message Schema
export const messageSchema = z.object({
  senderId: z.string().min(1, "Sender ID requis"),
  receiverId: z.string().min(1, "Receiver ID requis"),
  content: z.string().min(1, "Le message ne peut pas être vide"),
  requestId: z.string().optional(),
  organizationId: z.string().min(1, "Organization ID requis")
});

// ---------------------------------------------------------------------------
// Schémas de mise à jour — listes blanches strictes
// ---------------------------------------------------------------------------
// `.strict()` rejette tout champ inconnu. C'est la contre-mesure à
// l'affectation de masse : sans elle, un appelant pouvait injecter
// `organizationId`, `subscriptionTier`, `profileType` ou `password` dans un
// simple formulaire de profil (anomalie MS-004).

/** Champs qu'un utilisateur peut modifier lui-même sur son propre profil. */
export const profileUpdateSchema = z
  .object({
    name: z.string().min(1, 'Le nom est requis').max(120).optional(),
    onboardingCompleted: z.boolean().optional(),
    onboardingStep: z.number().int().min(0).max(20).optional(),
  })
  .strict();

/**
 * Champs modifiables sur une organisation.
 *
 * Volontairement absents : `id`, `stripeAccountId`, `stripeAccountStatus`,
 * `profileType`, `createdAt`. Ils relèvent de flux serveur dédiés.
 */
export const organizationUpdateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    slug: z
      .string()
      .regex(/^[a-z0-9-]+$/, 'Slug invalide')
      .max(80)
      .optional(),
    sector: z.string().max(120).optional(),
    industry: z.string().max(120).optional(),
    isPublic: z.boolean().optional(),
    description: z.string().max(2000).optional(),
    logo: z.string().url('URL de logo invalide').optional(),
    address: z.string().max(200).optional(),
    city: z.string().max(120).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().max(80).optional(),
    phone: z.string().max(40).optional(),
    legalNotice: z.string().max(2000).optional(),
    paymentTerms: z.string().max(2000).optional(),
    bankDetails: z.string().max(500).optional(),
  })
  .strict();

/**
 * Politique de mot de passe.
 *
 * Alignée sur NIST SP 800-63B : la longueur prime sur la complexité
 * arbitraire. 8 caractères minimum, pas d'expiration forcée.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une lettre minuscule')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une lettre majuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(/[^a-zA-Z0-9]/, 'Le mot de passe doit contenir au moins un caractère spécial')
  .max(128, 'Le mot de passe est trop long');

import { PARAMEDICAL_PROFESSION_CODES } from '@/lib/workspaces/paramedical/professions';
import { REGISTRATION_SECTOR_CODES } from '@/lib/registration/options';

/** Inscription. */
export const registerSchema = z
  .object({
    name: z.string().min(1, 'Le nom est requis').max(120),
    email: z.string().trim().toLowerCase().email('Email invalide').max(254),
    password: passwordSchema,
    orgName: z.string().min(1).max(200).optional(),
    profileType: z.enum(['client', 'professional']).default('client'),
    sector: z.enum(REGISTRATION_SECTOR_CODES).optional(),
    profession: z.enum(PARAMEDICAL_PROFESSION_CODES).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.profileType === 'client') {
      if (data.orgName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Les particuliers ne peuvent pas avoir de nom d\'entreprise',
          path: ['orgName'],
        });
      }
      if (data.sector) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Les particuliers ne peuvent pas avoir de secteur',
          path: ['sector'],
        });
      }
      if (data.profession) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Les particuliers ne peuvent pas avoir de profession',
          path: ['profession'],
        });
      }
    } else if (data.profileType === 'professional') {
      if (!data.orgName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le nom de l'entreprise est requis",
          path: ['orgName'],
        });
      }
      if (!data.sector) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le secteur d'activité est requis",
          path: ['sector'],
        });
      }

      if (data.sector === 'health') {
        if (!data.profession) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Veuillez sélectionner une profession',
            path: ['profession'],
          });
        }
      } else if (data.profession) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La profession n'est gérée que pour les professionnels de santé",
          path: ['profession'],
        });
      }
    }
  });
