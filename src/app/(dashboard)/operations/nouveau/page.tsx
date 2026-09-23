import { requireFieldServiceContext } from '@/lib/workspaces/field-service/context';
import { getFieldServiceWorkspaceConfig } from '@/lib/workspaces/field-service/config';
import { listFieldServiceSites } from '@/lib/services/field-service-operations.service';
import { db } from '@/lib/db/server';
import { clients } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import NewOperationForm from './NewOperationForm';

export default async function NewOperationPage() {
  const ctx = await requireFieldServiceContext();
  const workspace = getFieldServiceWorkspaceConfig(ctx.profession);

  const [clientsList, sitesList] = await Promise.all([
    db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.organizationId, ctx.organizationId))
      .orderBy(asc(clients.name)),
    listFieldServiceSites(ctx.organizationId, { isActive: true }),
  ]);

  const sites = sitesList.map(s => ({
    id: s.id,
    clientId: s.clientId,
    label: s.label,
    city: s.city,
    addressLine1: s.addressLine1,
  }));

  return (
    <NewOperationForm
      workspace={workspace}
      clients={clientsList}
      initialSites={sites}
    />
  );
}
