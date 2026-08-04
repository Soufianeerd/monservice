'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ProductForm from '@/components/crm/ProductForm';
import * as productActions from '@/app/actions/product.actions';
import { useAuth } from '@/components/auth/AuthContext';
import { Product } from '@/lib/data/interfaces';

export default function EditProductPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user?.organizationId) return;
      try {
        const data = await productActions.findByIdAction(params.id as string, user.organizationId);
        if (data) {
          setProduct(data);
        } else {
          router.push('/products');
        }
      } catch (error) {
        console.error('Erreur', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (user) loadData();
  }, [params.id, user, router]);

  const handleSubmit = async (data: Partial<Product>) => {
    if (!user?.organizationId) return;
    setIsSubmitting(true);
    const id = params.id as string;
    try {
      await productActions.updateAction(id, user.organizationId, {
        ...data,
      });

      // activityLog disabled

      router.push('/products');
    } catch (error) {
      console.error('Erreur lors de la modification', error);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;
  if (!product) return <div className="p-8 text-center text-red-500">Produit introuvable</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Modifier Produit</h1>
        <p className="mt-1 text-sm text-gray-500">
          Mise à jour des informations de {product.name}
        </p>
      </div>

      <ProductForm initialData={product} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
