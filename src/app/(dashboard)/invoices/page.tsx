'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import { invoiceRepository, clientRepository } from '@/lib/data';
import { Invoice, Client } from '@/lib/data/interfaces';
import InvoiceList from '@/components/crm/InvoiceList';
// import toast from 'react-hot-toast';

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user?.organizationId) return;
    await Promise.resolve();
      setLoading(true);
    try {
      const [invoicesData, clientsData] = await Promise.all([
        invoiceRepository.findByOrganization(user.organizationId),
        clientRepository.findByOrganization(user.organizationId)
      ]);
      setInvoices(invoicesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
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
    if (window.confirm("Voulez-vous vraiment supprimer ce document ?")) {
      await invoiceRepository.delete(id);
      alert('Document supprimé');
      loadData();
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    if (window.confirm("Marquer cette facture comme payée ?")) {
      await invoiceRepository.update(id, {
        status: 'paid',
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      alert('Facture payée');
      loadData();
    }
  };

  const handleConvertQuote = async (id: string) => {
    if (window.confirm("Convertir ce devis en facture ?")) {
      const quote = await invoiceRepository.getById(id);
      if (!quote) return;
      
      const newNumber = await invoiceRepository.getNextNumber('invoice', new Date().getFullYear());
      
      await invoiceRepository.update(id, {
        type: 'invoice',
        number: newNumber,
        status: 'draft',
        updatedAt: new Date().toISOString()
      });
      
      alert('Devis converti en facture !');
      loadData();
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Factures & Devis</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez vos factures et devis, suivez les paiements.
          </p>
        </div>
        <Link href="/invoices/new" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          + Nouveau Document
        </Link>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Chargement...</div>
      ) : (
        <InvoiceList 
          invoices={invoices} 
          clients={clients} 
          onDelete={handleDelete}
          onMarkAsPaid={handleMarkAsPaid}
          onConvertQuote={handleConvertQuote}
        />
      )}
    </div>
  );
}
