import { taskService } from '@/lib/services/task.service';
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { dashboardService } from '@/lib/services/dashboard.service';
import { dealService } from '@/lib/services/deal.service'; // For chart data
import DashboardStats from '@/components/crm/DashboardStats';
import DashboardChart from '@/components/crm/DashboardChart';
import { handleError } from '@/lib/utils/error-handler';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ clients: 0, activeDeals: 0, ongoingTasks: 0, revenue: 0, totalInvoiced: 0, totalUnpaid: 0 });
  const [chartData, setChartData] = useState<{month: string, revenue: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!user?.organizationId) return;

      try {
        const dashboardStats = await dashboardService.getProfessionalStats(user.organizationId);

        setStats({
          clients: dashboardStats.clients,
          activeDeals: dashboardStats.activeDeals,
          ongoingTasks: dashboardStats.pendingTasks,
          revenue: dashboardStats.totalRevenue,
          totalInvoiced: dashboardStats.totalRevenue, // Just mapping approximately to the UI
          totalUnpaid: dashboardStats.paidInvoices, // Ideally we would have unpaid invoices in the stats too, but mapping what we have
        });

        // Chart data for last 6 months (We still need deals for this, or a new method in dashboardService)
        const deals = await dealService.findAll(user.organizationId);
        const wonDeals = deals.filter((d: any) => d.status === 'won');
        
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const monthStr = d.toLocaleDateString('fr-FR', { month: 'short' });
          const year = d.getFullYear();
          const monthIdx = d.getMonth();

          const monthRevenue = wonDeals.filter((deal: any) => {
            const dealDate = new Date(deal.updatedAt);
            return dealDate.getMonth() === monthIdx && dealDate.getFullYear() === year;
          }).reduce((sum: number, deal: any) => sum + deal.value, 0);

          months.push({ month: monthStr, revenue: monthRevenue });
        }
        setChartData(months);

      } catch (error) {
        handleError(error, "Erreur chargement dashboard");
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
