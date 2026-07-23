'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import { invoiceRepository, clientRepository, productRepository, activityLogRepository } from '@/lib/data';
import { Client, Product } from '@/lib/data/interfaces';
import InvoiceForm, { InvoiceFormData } from '@/components/crm/InvoiceForm';
// import toast from 'react-hot-toast';
import { generateId } from '@/lib/utils/id-generator';

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
          clientRepository.findByOrganization(user.organizationId),
          productRepository.findByOrganization(user.organizationId)
        ]);
        setClients(clientsData);
        setProducts(productsData);
      } catch (error) {
        console.error('Erreur', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleSubmit = async (data: InvoiceFormData & { totalHT: number; taxAmount: number; totalTTC: number }) => {
    if (!user?.organizationId) return;
    
    setIsSubmitting(true);
    try {
      const year = new Date(data.date).getFullYear();
      const number = await invoiceRepository.getNextNumber(data.type, year);
      
      const linesWithIds = data.lines.map(line => ({
        ...line,
        id: line.id || generateId()
      }));

      const newInvoice = await invoiceRepository.create({
        organizationId: user.organizationId,
        type: data.type,
        number,
        date: new Date(data.date).toISOString(),
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        clientId: data.clientId,
        lines: linesWithIds as any,
        totalHT: data.totalHT,
        taxAmount: data.taxAmount,
        totalTTC: data.totalTTC,
        status: data.type === 'invoice' ? 'draft' : 'proposal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

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
      console.error('Erreur lors de la création', error);
      alert('Une erreur est survenue.');
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
