'use client';

import * as taskActions from '@/app/actions/task.actions';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import * as dealActions from '@/app/actions/deal.actions';
import * as clientActions from '@/app/actions/client.actions';
import * as invoiceActions from '@/app/actions/invoice.actions';
import { Deal, Invoice, Task, Client } from '@/lib/data/interfaces';
import AdvancedReports from '@/components/crm/AdvancedReports';

export default function ReportsPage() {
  const { user } = useAuth();
  
  const [deals, setDeals] = useState<Deal[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user?.organizationId) return;
      setLoading(true);
      try {
        const [d, i, t, c] = await Promise.all([
          dealActions.findAllAction(user.organizationId),
          invoiceActions.findAllAction(user.organizationId),
          taskActions.findByOrganizationAction(user.organizationId),
          clientActions.findAllAction(user.organizationId)
        ]);
        setDeals(d);
        setInvoices(i);
        setTasks(t);
        setClients(c);
      } catch (error) {
        console.error('Erreur chargement rapports', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  return (
    <div className="space-y-6">

      {loading ? (
        <div className="p-12 text-center text-gray-500">Génération des rapports...</div>
      ) : (
        <AdvancedReports 
          deals={deals} 
          invoices={invoices} 
          tasks={tasks} 
          clients={clients} 
        />
      )}
    </div>
  );
}
