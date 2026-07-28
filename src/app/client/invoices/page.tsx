'use client';

import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardBody } from '@/components/ui/Card';
import { Invoice } from '@/lib/data/interfaces';
import { invoiceRepository } from '@/lib/data/repositories';
import { useEffect, useState } from 'react';
import InvoiceList from '@/components/client/InvoiceList';

export default function ClientInvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (user?.id) {
      invoiceRepository.findByClient(user.id).then(allInvoices => {
        setInvoices(allInvoices.filter(i => i.type === 'invoice').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      });
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes factures</h1>
        <p className="text-gray-500">Consultez et téléchargez vos factures.</p>
      </div>

      <Card>
        <CardBody>
          <InvoiceList invoices={invoices} />
        </CardBody>
      </Card>
    </div>
  );
}
