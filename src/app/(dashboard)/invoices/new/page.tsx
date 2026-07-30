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
import { handleError } from '@/lib/utils/error-handler';

export default function NewInvoicePage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!user?.organizationId) return;
      try {
        const [clientsData, productsData] = await Promise.all([
          clientService.findAll(user.organizationId),
          productService.findAll(user.organizationId)
        ]);
        setClients(clientsData);
        setProducts(productsData);
      } catch (error) {
        console.error('Erreur', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (user) loadData();
  }, [user]);

  const handleSubmit = async (data: InvoiceFormData & { totalHT: number; taxAmount: number; totalTTC: number }) => {
    if (!user?.organizationId) return;
    
    setIsSubmitting(true);
    try {
      const type = data.type || 'invoice';
      const number = await invoiceService.getNextInvoiceNumber(user.organizationId, type);
      
      const { lines, ...rest } = data;

      const newInvoice = await invoiceService.create({
        type: type as any,
        number,
        date: data.date || new Date().toISOString(),
        dueDate: data.dueDate,
        status: 'draft',
        clientId: data.clientId || '',
        organizationId: user.organizationId,
        totalHT: data.totalHT || 0,
        taxAmount: data.taxAmount || 0,
        totalTTC: data.totalTTC || 0,
        message: data.notes, // Notes from form mapping to message
      }, (lines || []) as any, user.id);

      await activityLogRepository.create({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'CREATE',
        entityType: 'INVOICE',
        entityId: newInvoice.id,
        details: `Création du ${data.type === 'invoice' ? 'facture' : 'devis'} ${number}`,
        createdAt: new Date().toISOString(),
      });
      
      alert(data.type === 'invoice' ? 'Facture créée avec succès !' : 'Devis créé avec succès !');
      router.push('/invoices');
      router.refresh();
    } catch (error) {
      handleError(error, "Erreur lors de la création du document");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Nouveau Document</h1>
        <p className="mt-1 text-sm text-gray-500">
          Créer un devis ou une facture.
        </p>
      </div>

      <InvoiceForm 
        clients={clients} 
        products={products} 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
      />
    </div>
  );
}
