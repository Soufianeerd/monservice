'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductForm from '@/components/crm/ProductForm';
import * as productActions from '@/app/actions/product.actions';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuth } from '@/components/auth/AuthContext';
import { Product } from '@/lib/data/interfaces';

export default function NewProductPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isPractice = useWorkspace()?.type === 'paramedical';
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: Partial<Product>) => {
    if (!user?.organizationId) return;
    
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await productActions.createAction({
        name: data.name || '',
        description: data.description || '',
        unitPrice: data.unitPrice || 0,
        taxRate: data.taxRate ?? 20,
        organizationId: user.organizationId,
      });

      // activityLog disabled

      router.push('/facturation/produits');
      router.refresh();
    } catch {
      setErrorMessage('L’enregistrement a échoué. Vérifiez les informations et réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{isPractice ? 'Nouvelle prestation' : 'Nouveau produit ou service'}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ajoutez un élément à votre catalogue.
        </p>
      </div>

      {errorMessage && <p role="alert" className="text-sm text-red-700">{errorMessage}</p>}
      <ProductForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
