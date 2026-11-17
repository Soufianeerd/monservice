import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireProfessional } from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';
import { getAutomationSettings, listRecentDeliveries } from '@/lib/services/automation.service';
import { isCurrentUserTeamAdmin } from '@/lib/services/team.service';
import { isGrowthAvailable } from '@/lib/growth/availability';
import AutomationSettingsForm from '@/components/growth/AutomationSettingsForm';

export const metadata: Metadata = { title: 'Relances et avis' };

export default async function AutomationSettingsPage() {
  const ctx = await requireProfessional();
  const organization = await organizationService.getById(ctx.organizationId);
  if (!organization || !isGrowthAvailable(organization.sector)) notFound();
  const [settings, deliveries, isAdmin] = await Promise.all([
    getAutomationSettings(ctx.organizationId),
    listRecentDeliveries(ctx.organizationId),
    isCurrentUserTeamAdmin(),
  ]);
  return (
    <AutomationSettingsForm
      initial={settings}
      deliveries={deliveries}
      isAdmin={isAdmin}
      hasPaymentDetails={Boolean(organization.bankDetails?.trim() || organization.paymentTerms?.trim())}
      hasReplyEmail={Boolean(organization.email?.trim())}
    />
  );
}
