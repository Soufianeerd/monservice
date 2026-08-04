'use client';

import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { MessageSquareIcon, FileTextIcon, FileCheckIcon, CreditCardIcon } from 'lucide-react';
interface StatsProps {
  stats: {
    activeRequests: number;
    pendingQuotes: number;
    unpaidInvoices: number;
    unreadMessages: number;
  };
}

export default function ClientStats({ stats }: StatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-gray-500">Demandes actives</h3>
          <FileTextIcon className="h-4 w-4 text-indigo-500" />
        </CardHeader>
        <CardBody>
          <div className="text-3xl font-bold text-gray-900">{stats.activeRequests}</div>
        </CardBody>
      </Card>
      
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-gray-500">Devis en attente</h3>
          <FileCheckIcon className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardBody>
          <div className="text-3xl font-bold text-gray-900">{stats.pendingQuotes}</div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-gray-500">Factures à payer</h3>
          <CreditCardIcon className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardBody>
          <div className="text-3xl font-bold text-gray-900">{stats.unpaidInvoices}</div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-gray-500">Messages non lus</h3>
          <MessageSquareIcon className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardBody>
          <div className="text-3xl font-bold text-gray-900">{stats.unreadMessages}</div>
        </CardBody>
      </Card>
    </div>
  );
}
