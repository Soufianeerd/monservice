import { z } from 'zod';
import { MANUAL_PAYMENT_METHODS } from '@/lib/growth/payment';
import { REVIEW_REPORT_REASONS } from '@/lib/growth/review';
import { MAX_INTERVENTION_CITIES, MAX_PUBLIC_SERVICES, PUBLIC_SLUG_PATTERN } from '@/lib/growth/public-profile';

const id = z.string().trim().min(1).max(100);

export const recordPaymentSchema = z.object({
  invoiceId: id,
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date de règlement invalide.'),
  method: z.enum(MANUAL_PAYMENT_METHODS, { message: 'Choisissez un mode de règlement.' }),
});

export const automationSettingsSchema = z.object({
  invoiceRemindersEnabled: z.boolean(),
  quoteFollowupsEnabled: z.boolean(),
  quoteFollowupDays: z.number().int().min(3, 'Entre 3 et 30 jours.').max(30, 'Entre 3 et 30 jours.'),
  reviewRequestsEnabled: z.boolean(),
  reviewRequestDelayDays: z.number().int().min(0, 'Entre 0 et 30 jours.').max(30, 'Entre 0 et 30 jours.'),
});

export const reviewRequestSchema = z.object({ invoiceId: id });
export const reviewRequestIdSchema = z.object({ requestId: id });

export const reviewReplySchema = z.object({
  reviewId: id,
  reply: z.string().max(2000, 'La réponse est limitée à 2 000 caractères.'),
});

export const reviewReportSchema = z.object({
  reviewId: id,
  reason: z.enum(REVIEW_REPORT_REASONS),
});

export const submitReviewSchema = z.object({
  token: z.string().trim().min(1).max(100),
  rating: z.number().int().min(1, 'Choisissez une note de 1 à 5 étoiles.').max(5, 'Choisissez une note de 1 à 5 étoiles.'),
  comment: z.string().max(2000, 'Le commentaire est limité à 2 000 caractères.'),
  displayName: z.string().trim().min(1, 'Indiquez le nom à afficher.').max(60, 'Le nom affiché est limité à 60 caractères.'),
});

const optionalText = (max: number, message: string) => z.string().trim().max(max, message);

export const publicProfileSchema = z.object({
  slug: z.string().trim().toLowerCase().min(3, 'Adresse trop courte (3 caractères au moins).').max(60, 'Adresse trop longue.')
    .regex(PUBLIC_SLUG_PATTERN, 'Lettres minuscules, chiffres et tirets uniquement.'),
  published: z.boolean(),
  headline: optionalText(120, 'Accroche : 120 caractères au plus.'),
  about: optionalText(4000, 'Présentation : 4 000 caractères au plus.'),
  serviceArea: optionalText(300, 'Zone d’intervention : 300 caractères au plus.'),
  interventionCities: z.array(z.string().trim().min(1).max(80)).max(MAX_INTERVENTION_CITIES),
  services: z.array(z.string().trim().min(1).max(80)).max(MAX_PUBLIC_SERVICES),
  showPhone: z.boolean(),
  showEmail: z.boolean(),
  website: z.string().trim().max(300).refine((value) => value === '' || /^https:\/\/[^\s<>"]+$/.test(value), 'Le site web doit commencer par https://'),
});

export const portfolioItemSchema = z.object({
  id: z.string().trim().max(100).nullable().optional(),
  title: z.string().trim().min(1, 'Donnez un titre.').max(120, 'Titre : 120 caractères au plus.'),
  description: optionalText(1000, 'Description : 1 000 caractères au plus.').optional(),
  city: optionalText(80, 'Ville : 80 caractères au plus.').optional(),
  completedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  position: z.number().int().min(0).max(1000).optional(),
});

export const portfolioIdSchema = z.object({ id });

export const salesJournalRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((range) => range.from <= range.to, 'La date de début doit précéder la date de fin.');
