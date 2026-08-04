import { Tabs } from '@/components/ui/Tabs';

export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  const tabs = [
    { name: 'Profil', href: '/parametres/profil' },
    { name: 'Organisation', href: '/parametres/organisation' },
    { name: 'Facturation', href: '/parametres/facturation' },
    { name: 'Notifications', href: '/parametres/notifications' },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez votre profil, votre organisation et vos préférences.
        </p>
      </div>
      
      <Tabs tabs={tabs} />
      
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
