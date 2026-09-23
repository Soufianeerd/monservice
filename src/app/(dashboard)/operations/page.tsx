import { requireFieldServiceContext } from '@/lib/workspaces/field-service/context';
import { listFieldServiceWorkOrders } from '@/lib/services/field-service-operations.service';
import { getFieldServiceWorkspaceConfig } from '@/lib/workspaces/field-service/config';
import { db } from '@/lib/db/server';
import { clients } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import OperationsListClient from './OperationsListClient';

export default async function OperationsPage() {
  const ctx = await requireFieldServiceContext();
  const workspace = getFieldServiceWorkspaceConfig(ctx.profession);

  const [rawOperations, clientsList] = await Promise.all([
    listFieldServiceWorkOrders(ctx.organizationId, { limit: 100 }),
    db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.organizationId, ctx.organizationId))
      .orderBy(asc(clients.name)),
  ]);

  const operations = rawOperations.map(op => ({
    id: op.id,
    reference: op.reference,
    title: op.title,
    workType: op.workType,
    status: op.status,
    priority: op.priority,
    scheduledStart: op.scheduledStart ? op.scheduledStart.toISOString() : null,
    scheduledEnd: op.scheduledEnd ? op.scheduledEnd.toISOString() : null,
    actualStart: op.actualStart ? op.actualStart.toISOString() : null,
    actualEnd: op.actualEnd ? op.actualEnd.toISOString() : null,
    createdAt: op.createdAt.toISOString(),
    clientName: op.clientName,
    siteLabel: op.siteLabel,
    siteCity: op.siteCity,
  }));

  return (
    <OperationsListClient
      workspace={workspace}
      initialOperations={operations}
      clientsList={clientsList}
    />
  );
}
