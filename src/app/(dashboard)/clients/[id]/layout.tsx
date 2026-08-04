import { Tabs } from '@/components/ui/Tabs';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { findByIdAction } from '@/app/actions/client.actions';
import { getSessionAction } from '@/app/actions/session';

export default async function ClientLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const { user } = await getSessionAction();
  let clientName = 'Client';
  
  if (user?.organizationId) {
    const client = await findByIdAction(id, user.organizationId);
    if (client) {
      clientName = client.name;
    }
  }

  const tabs = [
    { name: 'Informations', href: `/clients/${id}` },
    { name: 'Contacts', href: `/clients/${id}/contacts` },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-2">
        <Link href="/clients" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{clientName}</h1>
      </div>
      
      <Tabs tabs={tabs} />
      
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
