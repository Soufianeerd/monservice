'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { productRepository, activityLogRepository } from '@/lib/data';
import { generateId } from '@/lib/utils/id-generator';
import { useAuth } from '@/components/auth/AuthContext';
import { Product } from '@/lib/data/interfaces';
import ProductForm, { ProductFormData } from '@/components/crm/ProductForm';
// import toast from 'react-hot-toast';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      try {
        const data = await productRepository.getById(id);
        if (data) setProduct(data);
        else router.push('/products');
      } catch (error) {
        console.error('Erreur', error);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id, router]);

  const handleSubmit = async (data: ProductFormData) => {
    const id = params?.id as string;
    if (!id) return;
    setIsSubmitting(true);
    try {
      await productRepository.update(id, {
        ...data,
        updatedAt: new Date().toISOString(),
      });

      if (user) {
        await activityLogRepository.create({
          organizationId: user.organizationId || '',
          userId: user.id,
          action: 'UPDATE',
          entityType: 'PRODUCT',
          entityId: id,
          details: `Mise à jour du produit ${data.name}`,
          createdAt: new Date().toISOString(),
        });
      }

      alert('Produit mis à jour !');
      router.push('/products');
      router.refresh();
    } catch (error) {
      console.error('Erreur', error);
      alert('Erreur lors de la mise à jour.');
    } finally {
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
