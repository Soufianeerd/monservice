import { Tabs } from '@/components/ui/Tabs';

export default function FacturationLayout({ children }: { children: React.ReactNode }) {
  const tabs = [
    { name: 'Factures', href: '/facturation/factures' },
    { name: 'Devis', href: '/facturation/devis' },
    { name: 'Produits', href: '/facturation/produits' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facturation</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez vos factures, devis et catalogue de produits.
          </p>
        </div>
      </div>
      
      <Tabs tabs={tabs} />
      
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
