import {
  generateInvitationToken,
  hashInvitationToken,
  isWellFormedInvitationToken,
} from '@/lib/client-portal/invitation-token';

// Avis clients vérifiés (migration 0020). Un avis naît uniquement d'un lien à
// usage unique envoyé au client d'une facture réglée. Même format de jeton que
// les invitations : seule l'empreinte SHA-256 est stockée.
export {
  generateInvitationToken as generateReviewToken,
  hashInvitationToken as hashReviewToken,
  isWellFormedInvitationToken as isWellFormedReviewToken,
};

export const REVIEW_REQUEST_TTL_DAYS = 30;
export const REVIEW_COMMENT_MAX = 2000;
export const REVIEW_AUTHOR_MAX = 60;

export const REVIEW_REPORT_REASONS = ['abusive', 'personal_data', 'not_a_client', 'off_topic'] as const;
export type ReviewReportReason = (typeof REVIEW_REPORT_REASONS)[number];

export const REVIEW_REPORT_LABELS: Record<ReviewReportReason, string> = {
  abusive: 'Propos injurieux ou diffamatoires',
  personal_data: 'Contient des données personnelles',
  not_a_client: 'Ne correspond pas à une prestation',
  off_topic: 'Hors sujet',
};

export function buildReviewUrl(base: string, token: string): string {
  const url = new URL('/laisser-un-avis', base);
  url.searchParams.set('token', token);
  return url.toString();
}

export type RatingSummary = { count: number; average: number | null };

/** Moyenne arrondie au dixième, null sans avis. */
export function summarizeRatings(ratings: number[]): RatingSummary {
  const valid = ratings.filter((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 5);
  if (valid.length === 0) return { count: 0, average: null };
  const average = valid.reduce((sum, rating) => sum + rating, 0) / valid.length;
  return { count: valid.length, average: Math.round(average * 10) / 10 };
}
