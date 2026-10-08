'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Eye, FileText, Send, CheckCircle, Clock, XCircle, Search, Filter } from 'lucide-react';
import * as invoiceActions from '@/app/actions/invoice.actions';
import * as clientActions from '@/app/actions/client.actions';
import { Invoice, Client } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';
import { PlusCircle } from 'lucide-react';
import InvoiceList from '@/components/crm/InvoiceList';

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user?.organizationId) return;
    setLoading(true);
    try {
      const [invsData, clientsData] = await Promise.all([
        invoiceActions.findAllAction(user.organizationId),
        clientActions.findAllAction(user.organizationId)
      ]);
      
      setInvoices(invsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setClients(clientsData);
    } catch (error) {
      console.error('Erreur chargement données', error);
      alert('Erreur lors du chargement des factures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!user?.organizationId) return;
    if (window.confirm("Voulez-vous vraiment supprimer ce document ?")) {
      await invoiceActions.deleteAction(id, user.organizationId, user.id);
      alert('Document supprimé');
      loadData();
    }
  };

  const handleConvertQuote = async (id: string) => {
    if (!user?.organizationId) return;
    if (window.confirm("Convertir ce devis en facture ?")) {
      const { convertQuoteToInvoiceAction } = await import('@/app/actions/quote.actions');
      await convertQuoteToInvoiceAction({ quoteId: id });

      alert('Devis converti en facture !');
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link href="/facturation/factures/new" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          + Nouveau Document
        </Link>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12 bg-white rounded-lg border border-gray-200">Chargement...</div>
      ) : (
        <InvoiceList 
          invoices={invoices} 
          clients={clients} 
          onDelete={handleDelete}
          onConvertQuote={handleConvertQuote}
        />
      )}
    </div>
  );
}
