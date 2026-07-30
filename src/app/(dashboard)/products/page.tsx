'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Edit, Trash2, Plus, Package } from 'lucide-react';
import { productService } from '@/lib/services/product.service';
import { Product } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';
import { Input } from '@/components/ui/Input';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/Table';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    if (!user?.organizationId) return;
    try {
      const data = await productService.findAll(user.organizationId);
      setProducts(data);
    } catch (error) {
      console.error('Erreur', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.organizationId]);

  const handleDelete = async (id: string) => {
    if (!user?.organizationId) return;
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce produit/service ?")) return;
    try {
      await productService.delete(id, user.organizationId);
      await loadData();
    } catch (error) {
      console.error('Erreur', error);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Produits et Services</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez votre catalogue de produits et services.
          </p>
        </div>
        <Link href="/products/new" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          + Nouveau Produit
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <Input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
            label="Recherche"
            hideLabel
          />
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Vue mobile: Cartes */}
            <div className="sm:hidden space-y-4">
              {filteredProducts.map((product) => (
                <Card key={product.id}>
                  <CardHeader>
                    <span className="font-bold text-gray-900">{product.name}</span>
                    <span className="font-semibold text-gray-900">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(product.unitPrice)}</span>
                  </CardHeader>
                  <CardBody>
                    <div className="text-sm text-gray-500">{product.description}</div>
                    <div className="text-sm text-gray-500">TVA: {product.taxRate}%</div>
                  </CardBody>
                  <CardFooter>
                    <Link href={`/products/${product.id}/edit`} className="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1" aria-label={`Modifier ${product.name}`}>
                      <Edit className="h-5 w-5" />
                    </Link>
                    <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1" aria-label={`Supprimer ${product.name}`}>
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </CardFooter>
                </Card>
              ))}
              {filteredProducts.length === 0 && (
                <div className="text-center py-6 text-sm text-gray-500">Aucun produit trouvé.</div>
              )}
            </div>

            {/* Vue desktop: Tableau */}
            <div className="hidden sm:block">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Nom</TableHeader>
                    <TableHeader>Prix HT</TableHeader>
                    <TableHeader>TVA</TableHeader>
                    <TableHeader className="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.description}</div>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(product.unitPrice)}
                      </TableCell>
                      <TableCell>
                        {product.taxRate}%
                      </TableCell>
                      <TableCell className="text-right space-x-3">
                        <Link href={`/products/${product.id}/edit`} className="text-indigo-600 hover:text-indigo-900 inline-flex focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded p-1" aria-label={`Modifier ${product.name}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900 inline-flex focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1" aria-label={`Supprimer ${product.name}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500">
                        Aucun produit trouvé.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
