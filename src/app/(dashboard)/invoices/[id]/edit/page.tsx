'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import { invoiceRepository, clientRepository, productRepository, activityLogRepository } from '@/lib/data';
import { Invoice, Client, Product } from '@/lib/data/interfaces';
import InvoiceForm, { InvoiceFormData } from '@/components/crm/InvoiceForm';
// import toast from 'react-hot-toast';
import { generateId } from '@/lib/utils/id-generator';

export default function EditInvoicePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id || !user?.organizationId) return;
      try {
        const inv = await invoiceRepository.getById(id);
        if (!inv || (inv.status !== 'draft' && inv.status !== 'proposal')) {
          alert("Ce document ne peut pas être modifié.");
          router.push(`/invoices/${id}`);
          return;
        }

        setInvoice(inv);
        
        const [clientsData, productsData] = await Promise.all([
          clientRepository.findByOrganization(user.organizationId),
          productRepository.findByOrganization(user.organizationId)
        ]);
        setClients(clientsData);
        setProducts(productsData);
      } catch (error) {
        console.error('Erreur', error);
        alert('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, user, router]);

  const handleSubmit = async (data: InvoiceFormData & { totalHT: number; taxAmount: number; totalTTC: number }) => {
    if (!invoice) return;
    
    setIsSubmitting(true);
    try {
      const linesWithIds = data.lines.map(line => ({
        ...line,
        id: line.id || generateId()
      }));

      await invoiceRepository.update(invoice.id, {
        clientId: data.clientId,
        date: new Date(data.date).toISOString(),
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        lines: linesWithIds as any,
        totalHT: data.totalHT,
        taxAmount: data.taxAmount,
        totalTTC: data.totalTTC,
        updatedAt: new Date().toISOString(),
      });

      if (user) {
        await activityLogRepository.create({
          organizationId: user.organizationId || '',
          userId: user.id,
          action: 'UPDATE',
          entityType: 'INVOICE',
          entityId: invoice.id,
          details: `Mise à jour du document ${invoice.number}`,
          createdAt: new Date().toISOString(),
        });
      }
      
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
