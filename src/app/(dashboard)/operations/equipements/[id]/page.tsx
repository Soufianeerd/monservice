import { notFound } from 'next/navigation';
import { requireFieldServiceContext } from '@/lib/workspaces/field-service/context';
import { listFieldServiceSites } from '@/lib/services/field-service-operations.service';
import { getFieldServiceAssetById } from '@/lib/services/field-service-assets.service';
import AssetDetailClient from './AssetDetailClient';

export const metadata = { title: 'Fiche équipement | MonService' };

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireFieldServiceContext();
  const asset = await getFieldServiceAssetById(ctx.organizationId, id);
  if (!asset) notFound();

  const sites = await listFieldServiceSites(ctx.organizationId, { clientId: asset.clientId, isActive: true });

  return (
    <AssetDetailClient
      today={new Date().toISOString().slice(0, 10)}
      sites={sites.map((s) => ({ id: s.id, label: s.label, city: s.city }))}
      asset={{
        id: asset.id,
        clientId: asset.clientId,
        siteId: asset.siteId,
        category: asset.category,
        label: asset.label,
        manufacturer: asset.manufacturer,
        model: asset.model,
        serialNumber: asset.serialNumber,
        installedOn: asset.installedOn,
        warrantyEndsOn: asset.warrantyEndsOn,
        status: asset.status,
        notes: asset.notes,
        maintenanceIntervalMonths: asset.maintenanceIntervalMonths,
        nextMaintenanceOn: asset.nextMaintenanceOn,
        clientName: asset.clientName,
        siteLabel: asset.siteLabel,
        siteAddressLine1: asset.siteAddressLine1,
        sitePostalCode: asset.sitePostalCode,
        siteCity: asset.siteCity,
        interventions: asset.interventions.map((i) => ({
          workOrderId: i.workOrderId,
          reference: i.reference,
          title: i.title,
          workType: i.workType,
          status: i.status,
          date: (i.actualEnd ?? i.scheduledStart ?? i.createdAt).toISOString(),
          reportSummary: i.reportSummary,
        })),
      }}
    />
  );
}
