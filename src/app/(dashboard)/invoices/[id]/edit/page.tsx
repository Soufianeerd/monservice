'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { invoiceService } from '@/lib/services/invoice.service';
import { clientService } from '@/lib/services/client.service';
import { productService } from '@/lib/services/product.service';
import { activityLogRepository } from '@/lib/data';
import { useAuth } from '@/components/auth/AuthContext';
import { Client, Product, Invoice } from '@/lib/data/interfaces';
import InvoiceForm, { InvoiceFormData } from '@/components/crm/InvoiceForm';

export default function EditInvoicePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!user?.organizationId) return;
      try {
        const id = params.id;
        const [inv, clientsData, productsData] = await Promise.all([
          invoiceService.findById(id, user.organizationId),
          clientService.findAll(user.organizationId),
          productService.findAll(user.organizationId)
        ]);
        
        if (inv) {
          setInvoice(inv);
        } else {
          router.push('/invoices');
        }
        
        setClients(clientsData);
        setProducts(productsData);
      } catch (error) {
        console.error('Erreur', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (user) loadData();
  }, [params.id, user, router]);

  const handleSubmit = async (data: InvoiceFormData & { totalHT: number; taxAmount: number; totalTTC: number }) => {
    if (!user?.organizationId || !invoice) return;
    
    setIsSubmitting(true);
    try {
      const { lines, ...rest } = data;

      await invoiceService.update(invoice.id, user.organizationId, {
        type: data.type as any,
        date: data.date || new Date().toISOString(),
        dueDate: data.dueDate,
        clientId: data.clientId || '',
        totalHT: data.totalHT || 0,
        taxAmount: data.taxAmount || 0,
        totalTTC: data.totalTTC || 0,
        message: data.notes,
        lines: (lines || []) as any,
      });

      await activityLogRepository.create({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'UPDATE',
        entityType: 'INVOICE',
        entityId: invoice.id,
        details: `Modification du ${data.type === 'invoice' ? 'facture' : 'devis'} ${invoice.number}`,
        createdAt: new Date().toISOString(),
      });
      
      alert('Document mis à jour avec succès !');
      router.push(`/invoices/${invoice.id}`);
      router.refresh();
    } catch (error) {
      console.error('Erreur lors de la mise à jour', error);
      alert('Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  if (!invoice) return <div className="p-8 text-center text-red-500">Document introuvable</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Modifier {invoice.type === 'invoice' ? 'Facture' : 'Devis'}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Mise à jour du document {invoice.number}
        </p>
      </div>

      <InvoiceForm 
        initialData={invoice}
        clients={clients} 
        products={products} 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
      />
    </div>
  );
}
