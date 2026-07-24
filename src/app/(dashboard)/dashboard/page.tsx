'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { clientRepository, dealRepository, taskRepository, invoiceRepository } from '@/lib/data';
import DashboardStats from '@/components/crm/DashboardStats';
import DashboardChart from '@/components/crm/DashboardChart';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ clients: 0, activeDeals: 0, ongoingTasks: 0, revenue: 0, totalInvoiced: 0, totalUnpaid: 0 });
  const [chartData, setChartData] = useState<{month: string, revenue: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!user?.organizationId) return;

      try {
        const [clients, deals, tasks, invoices] = await Promise.all([
          clientRepository.findByOrganization(user.organizationId),
          dealRepository.findByOrganization(user.organizationId),
          taskRepository.findByOrganization(user.organizationId),
          invoiceRepository.findByOrganization(user.organizationId) // I also need to import invoiceRepository
        ]);

        // Stats
        const activeDeals = deals.filter(d => ['prospect', 'qualification', 'proposal', 'negotiation'].includes(d.status)).length;
        const ongoingTasks = tasks.filter(t => t.status === 'En cours' || t.status === 'À faire').length;
        const wonDeals = deals.filter(d => d.status === 'won');
        const revenue = wonDeals.reduce((sum, d) => sum + d.value, 0);

        const allInvoices = invoices.filter(i => i.type === 'invoice');
        const totalInvoiced = allInvoices.reduce((sum, i) => sum + i.totalTTC, 0);
        const unpaidInvoices = allInvoices.filter(i => i.status === 'sent' || i.status === 'overdue');
        const totalUnpaid = unpaidInvoices.reduce((sum, i) => sum + i.totalTTC, 0);

        setStats({
          clients: clients.length,
          activeDeals,
          ongoingTasks,
          revenue,
          totalInvoiced,
          totalUnpaid
        });

        // Chart data for last 6 months
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const monthStr = d.toLocaleDateString('fr-FR', { month: 'short' });
          const year = d.getFullYear();
          const monthIdx = d.getMonth();

          const monthRevenue = wonDeals.filter(deal => {
            const dealDate = new Date(deal.updatedAt);
            return dealDate.getMonth() === monthIdx && dealDate.getFullYear() === year;
          }).reduce((sum, deal) => sum + deal.value, 0);

          months.push({ month: monthStr, revenue: monthRevenue });
        }
        setChartData(months);

      } catch (error) {
        console.error("Erreur chargement dashboard", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [user]);

  if (loading) {
    return <div className="p-8 text-center py-12 text-gray-500 animate-pulse">Chargement du dashboard...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      
      <DashboardStats 
        clientsCount={stats.clients}
        activeDealsCount={stats.activeDeals}
        ongoingTasksCount={stats.ongoingTasks}
        totalRevenue={stats.revenue}
        totalInvoiced={stats.totalInvoiced}
        totalUnpaid={stats.totalUnpaid}
      />

      <div className="mt-8">
        <DashboardChart data={chartData} />
      </div>
    </div>
  );
}
