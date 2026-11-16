import { requireProfessional } from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';
import { Tabs } from '@/components/ui/Tabs';

export default async function FacturationLayout({ children }: { children: React.ReactNode }) {
  const context = await requireProfessional();
  const organization = await organizationService.getById(context.organizationId);
  const isPractice = organization?.sector === 'health';
  const tabs = [
    { name: 'Factures', href: '/facturation/factures' },
    { name: 'Devis', href: '/facturation/devis' },
    { name: isPractice ? 'Prestations et tarifs' : 'Produits et services', href: '/facturation/produits' },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{isPractice ? 'Factures patients' : 'Facturation'}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isPractice ? 'Préparez les factures de vos prestations et suivez les règlements avec vos moyens habituels. Les devis proposent un prix avant la prestation ; le catalogue mémorise vos tarifs.' : 'Gérez vos factures, vos devis et vos tarifs.'}
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
