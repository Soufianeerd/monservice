'use client';
import { askConfirm } from '@/components/ui/ConfirmDialog';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import * as invoiceActions from '@/app/actions/invoice.actions';
import { Invoice, Client } from '@/lib/data/interfaces';
import InvoiceList from '@/components/crm/InvoiceList';

/** Liste des factures et devis : données fournies par la page serveur (aucun
 * aller-retour supplémentaire au chargement). */
export default function InvoicesPageClient({ initialInvoices, clients }: { initialInvoices: Invoice[]; clients: Client[] }) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);

  const handleDelete = async (id: string) => {
    if (!await askConfirm('Supprimer ce brouillon ? Cette action est définitive.')) return;
    try {
      await invoiceActions.deleteAction(id);
      setInvoices((current) => current.filter((invoice) => invoice.id !== id));
      toast.success('Brouillon supprimé');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Suppression impossible');
    }
  };

  const handleConvertQuote = async (id: string) => {
    if (!await askConfirm('Une facture brouillon sera créée à partir de ce devis.', { title: 'Convertir en facture ?', confirmLabel: 'Convertir', tone: 'default' })) return;
    try {
      const { convertQuoteToInvoiceAction } = await import('@/app/actions/quote.actions');
      await convertQuoteToInvoiceAction({ quoteId: id });
      toast.success('Devis converti en facture');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Conversion impossible');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link href="/facturation/factures/new" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          + Nouveau document
        </Link>
      </div>
      <InvoiceList invoices={invoices} clients={clients} onDelete={handleDelete} onConvertQuote={handleConvertQuote} />
    </div>
  );
}
