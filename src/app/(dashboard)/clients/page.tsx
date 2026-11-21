import { requireProfessional } from '@/lib/auth/session';
import { clientService } from '@/lib/services/client.service';
import ClientsPageClient from './ClientsPageClient';

/** Clients chargés côté serveur : la page arrive remplie. */
export default async function ClientsPage() {
  const { organizationId } = await requireProfessional();
  const clients = await clientService.findAll(organizationId);
  return <ClientsPageClient initialClients={clients} />;
}
