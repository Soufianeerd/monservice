import { notFound } from 'next/navigation';
import { requireFieldServiceContext } from '@/lib/workspaces/field-service/context';
import { getFieldServiceWorkspaceConfig } from '@/lib/workspaces/field-service/config';
import { getFieldServiceWorkOrderById } from '@/lib/services/field-service-operations.service';
import { db } from '@/lib/db/server';
import { users } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import OperationDetailClient from './OperationDetailClient';
import WorkOrderAssetsPanel from './WorkOrderAssetsPanel';
import { listAssetsForWorkOrder, listFieldServiceAssets } from '@/lib/services/field-service-assets.service';

interface OperationPageProps {
  params: Promise<{ id: string }>;
}

export default async function OperationDetailPage({ params }: OperationPageProps) {
  const { id } = await params;
  const ctx = await requireFieldServiceContext();
  const workspace = getFieldServiceWorkspaceConfig(ctx.profession);

  const [rawOperation, orgProfessionals] = await Promise.all([
    getFieldServiceWorkOrderById(ctx.organizationId, id),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(
        and(
          eq(users.organizationId, ctx.organizationId),
          eq(users.profileType, 'professional')
        )
      )
      .orderBy(asc(users.name)),
  ]);

  if (!rawOperation) {
    notFound();
  }

  const [linkedAssets, clientAssets] = await Promise.all([
    listAssetsForWorkOrder(ctx.organizationId, id),
    listFieldServiceAssets(ctx.organizationId, { clientId: rawOperation.clientId }),
  ]);
  const linkedIds = new Set(linkedAssets.map(a => a.id));
  const toOption = (a: { id: string; label: string; category: (typeof linkedAssets)[number]['category']; serialNumber: string | null }) => ({
    id: a.id,
    label: a.label,
    category: a.category,
    serialNumber: a.serialNumber,
  });

  const operation = {
    ...rawOperation,
    scheduledStart: rawOperation.scheduledStart ? rawOperation.scheduledStart.toISOString() : null,
    scheduledEnd: rawOperation.scheduledEnd ? rawOperation.scheduledEnd.toISOString() : null,
    actualStart: rawOperation.actualStart ? rawOperation.actualStart.toISOString() : null,
    actualEnd: rawOperation.actualEnd ? rawOperation.actualEnd.toISOString() : null,
    createdAt: rawOperation.createdAt.toISOString(),
    updatedAt: rawOperation.updatedAt.toISOString(),
    assignments: rawOperation.assignments.map(a => ({
      ...a,
      assignedAt: a.assignedAt.toISOString(),
      removedAt: a.removedAt ? a.removedAt.toISOString() : null,
    })),
    reports: rawOperation.reports.map(r => ({
      ...r,
      finalizedAt: r.finalizedAt ? r.finalizedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    history: rawOperation.history.map(h => ({
      ...h,
      createdAt: h.createdAt.toISOString(),
    })),
  };

  return (
    <>
      <OperationDetailClient
        workspace={workspace}
        initialOperation={operation}
        orgProfessionals={orgProfessionals}
      />
      <WorkOrderAssetsPanel
        workOrderId={id}
        isClosed={rawOperation.status === 'completed' || rawOperation.status === 'cancelled'}
        linkedAssets={linkedAssets.map(toOption)}
        availableAssets={clientAssets.filter(a => a.status !== 'decommissioned' && !linkedIds.has(a.id)).map(toOption)}
      />
    </>
  );
}
