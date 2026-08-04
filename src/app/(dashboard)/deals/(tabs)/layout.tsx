import { Tabs } from '@/components/ui/Tabs';

export default function DealsTabsLayout({ children }: { children: React.ReactNode }) {
  const tabs = [
    { name: 'Pipeline', href: '/deals/pipeline' },
    { name: 'Rapports', href: '/deals/rapports' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deals</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez votre pipeline commercial et analysez vos performances.
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
