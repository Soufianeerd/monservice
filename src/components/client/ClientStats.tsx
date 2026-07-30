'use client';

import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { MessageSquareIcon, FileTextIcon, FileCheckIcon, CreditCardIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { invoiceRepository } from '@/lib/data/repositories';
import { requestService } from '@/lib/services/request.service';
import { messageService } from '@/lib/services/message.service';

export default function ClientStats({ clientId }: { clientId: string }) {
  const [stats, setStats] = useState({
    activeRequests: 0,
    pendingQuotes: 0,
    unpaidInvoices: 0,
    unreadMessages: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!clientId) return;

      const requests = await requestService.findByClientId(clientId);
      const invoices = await invoiceRepository.findByClientId(clientId);
      const unreadCount = await messageService.getUnreadCount(clientId);

      const activeReqs = requests.filter(r => r.status === 'published' || r.status === 'in_progress').length;
      const quotes = invoices.filter(i => i.type === 'quote' && i.status === 'sent').length;
      const unpaid = invoices.filter(i => i.type === 'invoice' && i.status !== 'paid' && i.status !== 'cancelled').length;

      setStats({
        activeRequests: activeReqs,
        pendingQuotes: quotes,
        unpaidInvoices: unpaid,
        unreadMessages: unreadCount,
      });
    };
    
    fetchStats();
  }, [clientId]);

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
