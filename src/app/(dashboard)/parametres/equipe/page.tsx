import type { Metadata } from 'next';
import { requireProfessional } from '@/lib/auth/session';
import { getTeamOverview } from '@/lib/services/team.service';
import TeamManager from '@/components/settings/TeamManager';

export const metadata: Metadata = { title: 'Équipe' };

export default async function TeamSettingsPage() {
  const ctx = await requireProfessional();
  const overview = await getTeamOverview(ctx.organizationId, ctx.userId);
  return <TeamManager overview={overview} />;
}
