import { getOrganizationForRequest } from '@/lib/services/organization-request';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireProfessional } from '@/lib/auth/session';
import { getReviewOverview } from '@/lib/services/review.service';
import { getOwnPublicProfile } from '@/lib/services/public-profile.service';
import { getAutomationSettings } from '@/lib/services/automation.service';
import { isCurrentUserTeamAdmin } from '@/lib/services/team.service';
import { isGrowthAvailable } from '@/lib/growth/availability';
import ReviewsManager from '@/components/growth/ReviewsManager';

export const metadata: Metadata = { title: 'Avis clients' };

export default async function ClientReviewsPage() {
  const ctx = await requireProfessional();
  const organization = await getOrganizationForRequest(ctx.organizationId);
  if (!organization || !isGrowthAvailable(organization.sector)) notFound();
  const [overview, profile, settings, isAdmin] = await Promise.all([
    getReviewOverview(ctx.organizationId),
    getOwnPublicProfile(ctx.organizationId),
    getAutomationSettings(ctx.organizationId),
    isCurrentUserTeamAdmin(),
  ]);
  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <ReviewsManager
        overview={overview}
        isAdmin={isAdmin}
        publicSlug={profile.exists && profile.published ? profile.slug : null}
        autoRequests={settings.reviewRequestsEnabled}
      />
    </div>
  );
}
