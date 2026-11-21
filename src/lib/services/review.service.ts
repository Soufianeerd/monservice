import 'server-only';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { clientReviewRequests, clientReviews, clients, invoices, organizations } from '@/lib/db/schema';
import { AppError } from '@/lib/errors';
import { sendEmail } from '@/lib/email';
import { reviewRequestTemplate } from '@/lib/email/templates';
import {
  buildReviewUrl,
  generateReviewToken,
  hashReviewToken,
  isWellFormedReviewToken,
  summarizeRatings,
  type RatingSummary,
  type ReviewReportReason,
} from '@/lib/growth/review';
import { translatePostgresError } from '@/lib/utils/postgres-error';

// Avis clients vérifiés (migration 0020). La base est l'autorité : demande
// uniquement pour une facture réglée de l'organisation, dépôt uniquement par
// le titulaire du lien, note et commentaire immuables.

const KNOWN_ERRORS: Array<[string, AppError]> = [
  ['Invoice must be paid', new AppError('Enregistrez d’abord le règlement de cette facture : seul un client ayant réglé peut laisser un avis.', 409, 'INVOICE_NOT_PAID')],
  ['Client email required', new AppError('Ce client n’a pas d’adresse e-mail. Ajoutez-la à sa fiche pour lui demander un avis.', 409, 'CLIENT_EMAIL_REQUIRED')],
  ['Review already requested', new AppError('Un avis a déjà été demandé pour cette facture.', 409, 'REVIEW_ALREADY_REQUESTED')],
  ['Reviews unavailable for this sector', new AppError('Les avis clients ne sont pas disponibles pour ce secteur.', 403, 'SECTOR_UNAVAILABLE')],
  ['Invoice not found', new AppError('Facture introuvable.', 404, 'INVOICE_NOT_FOUND')],
  ['Review request unavailable', new AppError('Ce lien a expiré, a été retiré ou a déjà servi.', 410, 'REVIEW_LINK_UNAVAILABLE')],
  ['Organization admin required', new AppError('Seul un administrateur de l’organisation peut répondre aux avis ou les signaler.', 403, 'TEAM_ADMIN_REQUIRED')],
  ['Review not found or already reported', new AppError('Cet avis a déjà été signalé.', 409, 'REVIEW_ALREADY_REPORTED')],
  ['Review not found', new AppError('Avis introuvable.', 404, 'REVIEW_NOT_FOUND')],
  ['A professional account is required', new AppError('Un compte professionnel est nécessaire.', 403, 'PROFESSIONAL_ACCOUNT_REQUIRED')],
  ['client_reviews_rating_check', new AppError('Choisissez une note de 1 à 5 étoiles.', 400, 'INVALID_RATING')],
  ['client_reviews_author_check', new AppError('Indiquez un nom d’affichage (60 caractères au plus).', 400, 'INVALID_AUTHOR')],
  ['client_reviews_comment_check', new AppError('Le commentaire est limité à 2 000 caractères.', 400, 'INVALID_COMMENT')],
  ['client_reviews_reply_check', new AppError('La réponse est limitée à 2 000 caractères.', 400, 'INVALID_REPLY')],
];

export type ReviewRequestResult = { url: string; email: string; emailSent: boolean };

export type OwnReview = {
  id: string;
  rating: number;
  comment: string | null;
  author: string;
  createdAt: string;
  invoiceNumber: string | null;
  reply: string | null;
  repliedAt: string | null;
  reportedAt: string | null;
  reportReason: string | null;
  hidden: boolean;
};

export type PendingReviewRequest = {
  id: string;
  invoiceNumber: string | null;
  clientName: string | null;
  email: string;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
  automatic: boolean;
};

export type ReviewOverview = {
  summary: RatingSummary;
  reviews: OwnReview[];
  pending: PendingReviewRequest[];
  reviewableInvoices: Array<{ id: string; number: string; clientName: string | null; paidAt: string | null }>;
};

export type ReviewLinkPreview = {
  organizationName: string;
  invoiceNumber: string;
  invoiceDate: string;
  suggestedName: string;
  state: 'pending' | 'used' | 'expired' | 'revoked';
};

export async function requestClientReview(
  ctx: { organizationId: string },
  invoiceId: string,
  appBaseUrl: string,
): Promise<ReviewRequestResult> {
  const token = generateReviewToken();
  try {
    await db.execute(sql`select public.request_client_review(${invoiceId}, ${hashReviewToken(token)})`);
  } catch (err) {
    translatePostgresError(err, KNOWN_ERRORS);
  }
  const [row] = await db
    .select({ email: clientReviewRequests.email, clientName: clients.name, organizationName: organizations.name, organizationEmail: organizations.email })
    .from(clientReviewRequests)
    .innerJoin(clients, and(eq(clients.id, clientReviewRequests.clientId), eq(clients.organizationId, clientReviewRequests.organizationId)))
    .innerJoin(organizations, eq(organizations.id, clientReviewRequests.organizationId))
    .where(and(eq(clientReviewRequests.invoiceId, invoiceId), eq(clientReviewRequests.organizationId, ctx.organizationId), isNull(clientReviewRequests.revokedAt)))
    .limit(1);
  if (!row) throw new AppError('Demande d’avis introuvable après création.', 500, 'REVIEW_REQUEST_MISSING');
  const url = buildReviewUrl(appBaseUrl, token);
  const template = reviewRequestTemplate({
    clientName: row.clientName?.trim() || 'Madame, Monsieur',
    organizationName: row.organizationName,
    url,
  });
  const sent = await sendEmail({
    to: row.email,
    subject: template.subject,
    html: template.html,
    replyTo: row.organizationEmail ?? undefined,
    tag: 'review.request',
    onBehalfOf: row.organizationName,
  });
  return { url, email: row.email, emailSent: sent.sent };
}

export async function revokeReviewRequest(requestId: string): Promise<void> {
  try {
    await db.execute(sql`select public.revoke_client_review_request(${requestId})`);
  } catch (err) {
    translatePostgresError(err, KNOWN_ERRORS);
  }
}

export async function replyToReview(reviewId: string, reply: string): Promise<void> {
  try {
    await db.execute(sql`select public.reply_client_review(${reviewId}, ${reply})`);
  } catch (err) {
    translatePostgresError(err, KNOWN_ERRORS);
  }
}

export async function reportReview(reviewId: string, reason: ReviewReportReason): Promise<void> {
  try {
    await db.execute(sql`select public.report_client_review(${reviewId}, ${reason})`);
  } catch (err) {
    translatePostgresError(err, KNOWN_ERRORS);
  }
}

export async function getReviewOverview(organizationId: string): Promise<ReviewOverview> {
  const [reviewRows, requestRows, paidRows] = await Promise.all([
    db
      .select({ review: clientReviews, invoiceNumber: invoices.number })
      .from(clientReviews)
      .leftJoin(invoices, eq(invoices.id, clientReviews.invoiceId))
      .where(eq(clientReviews.organizationId, organizationId))
      .orderBy(desc(clientReviews.createdAt))
      .limit(200),
    db
      .select({ request: clientReviewRequests, invoiceNumber: invoices.number, clientName: clients.name })
      .from(clientReviewRequests)
      .leftJoin(invoices, eq(invoices.id, clientReviewRequests.invoiceId))
      .leftJoin(clients, and(eq(clients.id, clientReviewRequests.clientId), eq(clients.organizationId, clientReviewRequests.organizationId)))
      .where(and(eq(clientReviewRequests.organizationId, organizationId), isNull(clientReviewRequests.usedAt), isNull(clientReviewRequests.revokedAt)))
      .orderBy(desc(clientReviewRequests.createdAt))
      .limit(100),
    db
      .select({ id: invoices.id, number: invoices.number, clientName: clients.name, paidAt: invoices.paidAt })
      .from(invoices)
      .leftJoin(clients, and(eq(clients.id, invoices.clientId), eq(clients.organizationId, invoices.organizationId)))
      .where(and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.type, 'invoice'),
        eq(invoices.status, 'paid'),
        sql`not exists (select 1 from public.client_review_requests r where r.invoice_id = ${invoices.id} and r.revoked_at is null)`,
      ))
      .orderBy(desc(invoices.paidAt))
      .limit(50),
  ]);

  const now = Date.now();
  const reviews: OwnReview[] = reviewRows.map(({ review, invoiceNumber }) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    author: review.authorDisplayName,
    createdAt: review.createdAt.toISOString(),
    invoiceNumber,
    reply: review.reply,
    repliedAt: review.repliedAt?.toISOString() ?? null,
    reportedAt: review.reportedAt?.toISOString() ?? null,
    reportReason: review.reportReason,
    hidden: review.hiddenAt !== null,
  }));
  return {
    summary: summarizeRatings(reviews.filter((review) => !review.hidden).map((review) => review.rating)),
    reviews,
    pending: requestRows.map(({ request, invoiceNumber, clientName }) => ({
      id: request.id,
      invoiceNumber,
      clientName,
      email: request.email,
      createdAt: request.createdAt.toISOString(),
      expiresAt: request.expiresAt.toISOString(),
      expired: request.expiresAt.getTime() <= now,
      automatic: request.createdByUserId === null,
    })),
    reviewableInvoices: paidRows,
  };
}

/** Aperçu public d'un lien d'avis : aucune session requise. */
export async function previewReviewLink(token: string): Promise<ReviewLinkPreview | null> {
  if (!isWellFormedReviewToken(token)) return null;
  const rows = await db.execute(sql`select * from public.preview_client_review_request(${hashReviewToken(token)})`);
  const row = rows[0];
  if (!row) return null;
  const state = String(row.state);
  return {
    organizationName: String(row.organization_name ?? ''),
    invoiceNumber: String(row.invoice_number ?? ''),
    invoiceDate: String(row.invoice_date ?? ''),
    suggestedName: String(row.suggested_name ?? '').slice(0, 60),
    state: state === 'pending' || state === 'used' || state === 'expired' ? state : 'revoked',
  };
}

export async function submitReview(token: string, input: { rating: number; comment: string; displayName: string }): Promise<void> {
  if (!isWellFormedReviewToken(token)) {
    throw new AppError('Ce lien a expiré, a été retiré ou a déjà servi.', 410, 'REVIEW_LINK_UNAVAILABLE');
  }
  try {
    await db.execute(sql`select public.submit_client_review(${hashReviewToken(token)}, ${input.rating}, ${input.comment}, ${input.displayName})`);
  } catch (err) {
    translatePostgresError(err, KNOWN_ERRORS);
  }
}
