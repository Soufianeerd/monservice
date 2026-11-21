import { requireProfessional } from '@/lib/auth/session';
import { invoiceService } from '@/lib/services/invoice.service';
import { clientService } from '@/lib/services/client.service';
import InvoicesPageClient from './InvoicesPageClient';

/** Données chargées côté serveur : la page arrive remplie (plus de chargement
 * différé par deux actions après l'affichage). */
export default async function InvoicesPage() {
  const { organizationId } = await requireProfessional();
  const [invoices, clients] = await Promise.all([
    invoiceService.findAll(organizationId),
    clientService.findAll(organizationId),
  ]);
  const sorted = [...invoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return <InvoicesPageClient initialInvoices={sorted} clients={clients} />;
}
