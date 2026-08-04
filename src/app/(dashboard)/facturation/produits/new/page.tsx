'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductForm from '@/components/crm/ProductForm';
import * as productActions from '@/app/actions/product.actions';
import { useAuth } from '@/components/auth/AuthContext';
import { Product } from '@/lib/data/interfaces';

export default function NewProductPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: Partial<Product>) => {
    if (!user?.organizationId) return;
    
    setIsSubmitting(true);
    try {
      const newProduct = await productActions.createAction({
        name: data.name || '',
        description: data.description || '',
        unitPrice: data.unitPrice || 0,
        taxRate: data.taxRate || 20,
        organizationId: user.organizationId,
      });

      // activityLog disabled

      alert('Produit créé avec succès !');
      router.push('/products');
      router.refresh();
    } catch (error) {
      console.error('Erreur lors de la création du produit', error);
      alert('Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Nouveau Produit / Service</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ajoutez un élément à votre catalogue.
        </p>
      </div>

      <ProductForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
