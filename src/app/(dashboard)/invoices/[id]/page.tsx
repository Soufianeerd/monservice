'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { invoiceRepository, clientRepository, productRepository } from '@/lib/data';
import { Invoice, Client, Product } from '@/lib/data/interfaces';
import InvoiceDetail from '@/components/crm/InvoiceDetail';
// import toast from 'react-hot-toast';

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!id) return;
    try {
      const inv = await invoiceRepository.getById(id);
      if (inv) {
        setInvoice(inv);
        const [c, p] = await Promise.all([
          clientRepository.getById(inv.clientId),
          productRepository.findByOrganization(inv.organizationId)
        ]);
        if (c) setClient(c);
        setProducts(p);
      } else {
        router.push('/invoices');
      }
    } catch (error) {
      console.error('Erreur', error);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, router]);

  const handleMarkAsPaid = async () => {
    if (invoice) {
      await invoiceRepository.update(invoice.id, {
        status: 'paid',
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      loadData();
    }
  };

  const handleDelete = async () => {
    if (invoice) {
      await invoiceRepository.delete(invoice.id);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  if (!invoice) return <div className="p-8 text-center text-red-500">Document introuvable</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <InvoiceDetail 
        invoice={invoice} 
        client={client} 
        products={products} 
        onMarkAsPaid={handleMarkAsPaid}
        onDelete={handleDelete}
      />
    </div>
  );
}
