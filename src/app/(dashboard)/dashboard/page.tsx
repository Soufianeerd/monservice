import { getSessionAction } from '@/app/actions/session';
import DashboardStats from '@/components/crm/DashboardStats';
import DashboardChart from '@/components/crm/DashboardChart';
import { getProfessionalStatsAction } from '@/app/actions/dashboard.actions';
import { findAllAction as getDealsAction } from '@/app/actions/deal.actions';
import { Deal } from '@/lib/data/interfaces';

export default async function DashboardPage() {
  const { user } = await getSessionAction();
  
  if (!user?.organizationId) {
    return <div className="p-8 text-center text-gray-500">Chargement du dashboard...</div>;
  }

  const dashboardStats = await getProfessionalStatsAction(user.organizationId);
  const deals = await getDealsAction(user.organizationId);
  
  const stats = {
    clients: dashboardStats.clients,
    activeDeals: dashboardStats.activeDeals,
    ongoingTasks: dashboardStats.pendingTasks,
    revenue: dashboardStats.totalRevenue,
    totalInvoiced: dashboardStats.totalRevenue,
    totalUnpaid: dashboardStats.paidInvoices,
  };

  const wonDeals = deals.filter((d: Deal) => d.status === 'won');
  
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthStr = d.toLocaleDateString('fr-FR', { month: 'short' });
    const year = d.getFullYear();
    const monthIdx = d.getMonth();

    const monthRevenue = wonDeals.filter((deal: Deal) => {
      const dealDate = new Date(deal.updatedAt);
      return dealDate.getMonth() === monthIdx && dealDate.getFullYear() === year;
    }).reduce((sum: number, deal: Deal) => sum + deal.value, 0);

    months.push({ month: monthStr, revenue: monthRevenue });
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
        <DashboardChart data={months} />
      </div>
    </div>
  );
}
