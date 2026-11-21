import { requireProfessional } from '@/lib/auth/session';
import { dealService } from '@/lib/services/deal.service';
import { clientService } from '@/lib/services/client.service';
import PipelinePageClient from './PipelinePageClient';

/** Données chargées côté serveur : le pipeline arrive rempli. */
export default async function PipelinePage() {
  const { organizationId } = await requireProfessional();
  const [deals, clients] = await Promise.all([
    dealService.findAll(organizationId),
    clientService.findAll(organizationId),
  ]);
  return <PipelinePageClient initialDeals={deals} clients={clients} />;
}
