import { asc, eq } from 'drizzle-orm';
import { requireFieldServiceContext } from '@/lib/workspaces/field-service/context';
import { listFieldServiceSites } from '@/lib/services/field-service-operations.service';
import {
  getFieldServiceAssetMetrics,
  listFieldServiceAssets,
} from '@/lib/services/field-service-assets.service';
import { db } from '@/lib/db/server';
import { clients } from '@/lib/db/schema';
import AssetsClient from './AssetsClient';

export const metadata = { title: 'Équipements clients | MonService' };

export default async function AssetsPage() {
  const ctx = await requireFieldServiceContext();
  const today = new Date().toISOString().slice(0, 10);

  const [assets, metrics, clientsList, sites] = await Promise.all([
    listFieldServiceAssets(ctx.organizationId),
    getFieldServiceAssetMetrics(ctx.organizationId, today),
    db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.organizationId, ctx.organizationId))
      .orderBy(asc(clients.name)),
    listFieldServiceSites(ctx.organizationId, { isActive: true }),
  ]);

  return (
    <AssetsClient
      today={today}
      metrics={metrics}
      clients={clientsList}
      sites={sites.map((s) => ({ id: s.id, clientId: s.clientId, label: s.label, city: s.city }))}
      assets={assets.map((a) => ({
        id: a.id,
        clientId: a.clientId,
        category: a.category,
        label: a.label,
        manufacturer: a.manufacturer,
        model: a.model,
        serialNumber: a.serialNumber,
        warrantyEndsOn: a.warrantyEndsOn,
        status: a.status,
        clientName: a.clientName,
        siteLabel: a.siteLabel,
        siteCity: a.siteCity,
        interventionCount: a.interventionCount,
        lastInterventionAt: a.lastInterventionAt,
      }))}
    />
  );
}
