import { getOrganizationForRequest } from '@/lib/services/organization-request';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireProfessional } from '@/lib/auth/session';
import { getOwnPublicProfile, listPortfolio } from '@/lib/services/public-profile.service';
import { isCurrentUserTeamAdmin } from '@/lib/services/team.service';
import { isGrowthAvailable } from '@/lib/growth/availability';
import PublicProfileEditor from '@/components/growth/PublicProfileEditor';

export const metadata: Metadata = { title: 'Vitrine publique' };

export default async function PublicProfileSettingsPage() {
  const ctx = await requireProfessional();
  const organization = await getOrganizationForRequest(ctx.organizationId);
  if (!organization || !isGrowthAvailable(organization.sector)) notFound();
  const [profile, portfolio, isAdmin] = await Promise.all([
    getOwnPublicProfile(ctx.organizationId),
    listPortfolio(ctx.organizationId),
    isCurrentUserTeamAdmin(),
  ]);
  return (
    <PublicProfileEditor
      initial={profile}
      portfolio={portfolio}
      isAdmin={isAdmin}
      organization={{ name: organization.name, phone: organization.phone ?? null, email: organization.email ?? null, city: organization.city ?? null }}
    />
  );
}
