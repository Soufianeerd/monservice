'use client';

import { useEffect, useState } from 'react';
import { invoiceRepository  } from '@/lib/data/repositories';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ClockIcon } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { requestService } from '@/lib/services/request.service';

interface ActivityItem {
  id: string;
  title: string;
  date: string;
  type: 'request' | 'quote' | 'invoice';
  link: string;
}

export default function ClientRecentActivity({ clientId }: { clientId: string }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!clientId) return;

      const requests = await requestService.findByClientId(clientId);
      const invoices = await invoiceRepository.findByClientId(clientId);

      const items: ActivityItem[] = [
        ...requests.map(r => ({
          id: `req-${r.id}`,
          title: `Demande de service créée : ${r.title}`,
          date: r.createdAt,
          type: 'request' as const,
          link: `/client/requests/${r.id}`
        })),
        ...invoices.filter(i => i.type === 'quote').map(q => ({
          id: `quote-${q.id}`,
          title: `Devis reçu : ${q.number}`,
          date: q.createdAt,
          type: 'quote' as const,
          link: `/client/quotes/${q.id}`
        })),
        ...invoices.filter(i => i.type === 'invoice').map(inv => ({
          id: `inv-${inv.id}`,
          title: `Facture émise : ${inv.number}`,
          date: inv.createdAt,
          type: 'invoice' as const,
          link: `/client/invoices/${inv.id}`
        }))
      ];

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setActivities(items.slice(0, 5));
    };
    
    fetchActivity();
  }, [clientId]);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-medium text-gray-900">Activité récente</h2>
      </CardHeader>
      <CardBody>
        {activities.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            Aucune activité récente.
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {activities.map(activity => (
              <Link key={activity.id} href={activity.link} className="flex items-start p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                <div className="bg-gray-100 p-2 rounded-full mr-3 mt-0.5">
                  <ClockIcon className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-500">{format(new Date(activity.date), 'PP à HH:mm', { locale: fr })}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
