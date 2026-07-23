'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { dealRepository, invoiceRepository, taskRepository, clientRepository } from '@/lib/data';
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
          dealRepository.findByOrganization(user.organizationId),
          invoiceRepository.findByOrganization(user.organizationId),
          taskRepository.findByOrganization(user.organizationId),
          clientRepository.findByOrganization(user.organizationId)
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
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Rapports & Statistiques</h1>
        <p className="mt-1 text-sm text-gray-500">
          Analysez les performances de votre activité.
        </p>
      </div>

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
