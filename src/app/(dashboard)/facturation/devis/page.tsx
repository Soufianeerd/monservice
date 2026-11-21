import { requireProfessional } from '@/lib/auth/session';
import { invoiceService } from '@/lib/services/invoice.service';
import QuotesPageClient from './QuotesPageClient';

/** Données chargées côté serveur : la liste arrive remplie. */
export default async function QuotesPage() {
  const { organizationId } = await requireProfessional();
  const documents = await invoiceService.findByProfessional(organizationId);
  const quotes = documents
    .filter((document) => document.type === 'quote')
    .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
  return <QuotesPageClient initialQuotes={quotes} />;
}
