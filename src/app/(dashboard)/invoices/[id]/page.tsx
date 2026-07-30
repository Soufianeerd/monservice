'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, FileText, Send, Download, DollarSign } from 'lucide-react';
import { invoiceService } from '@/lib/services/invoice.service';
import { clientService } from '@/lib/services/client.service';
import { Invoice, Client, Product } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';
import InvoiceDetail from '@/components/crm/InvoiceDetail';

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user?.organizationId) return;
      try {
        const id = params.id;
        const [inv, allProducts] = await Promise.all([
          invoiceService.findById(id, user.organizationId),
          import('@/lib/services/product.service').then(m => m.productService.findAll(user.organizationId!))
        ]);
        
        if (inv) {
          setInvoice(inv);
          if (inv.clientId) {
            const cli = await clientService.findById(inv.clientId, user.organizationId);
            setClient(cli);
          }
          setProducts(allProducts);
        } else {
          router.push('/invoices');
        }
      } catch (error) {
        console.error('Erreur', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (user) loadData();
  }, [params.id, user, router]);

  const handleMarkAsPaid = async () => {
    if (!user?.organizationId || !invoice) return;
    if (window.confirm("Marquer cette facture comme payée ?")) {
      await invoiceService.update(invoice.id, user.organizationId, {
        status: 'paid',
        paidAt: new Date().toISOString(),
      });
      alert('Facture payée');
      router.refresh();
      const inv = await invoiceService.findById(invoice.id, user.organizationId);
      setInvoice(inv);
    }
  };

  const handleDelete = async () => {
    if (!user?.organizationId || !invoice) return;
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) {
      await invoiceService.delete(invoice.id, user.organizationId);
      alert('Document supprimé');
      router.push('/invoices');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  if (!invoice) return <div className="p-8 text-center text-red-500">Document introuvable</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <InvoiceDetail 
        invoice={invoice} 
        client={client || undefined} 
        products={products} 
        onMarkAsPaid={handleMarkAsPaid}
        onDelete={handleDelete}
      />
    </div>
  );
}
