import { prepareStarterPractice } from '@/lib/services/practice-starter.service';
import { getSessionAction, getOrganizationAction } from '@/app/actions/session';
import DashboardStats from '@/components/crm/DashboardStats';
import DashboardChart from '@/components/crm/DashboardChart';
import { getProfessionalStatsAction } from '@/app/actions/dashboard.actions';
import { dashboardService } from '@/lib/services/dashboard.service';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import { getPracticeDashboardAction } from '@/app/actions/practice-dashboard.actions';
import { getFieldServiceDashboardMetrics } from '@/lib/services/field-service-operations.service';
import ParamedicalPracticeDashboard from '@/components/dashboard/ParamedicalPracticeDashboard';
import FieldServiceDashboard from '@/components/dashboard/FieldServiceDashboard';

export default async function DashboardPage() {
  const [{ user }, organization] = await Promise.all([
    getSessionAction(),
    getOrganizationAction(),
  ]);
  
  if (!user?.organizationId) {
    return <div className="p-8 text-center text-gray-500">Chargement du dashboard...</div>;
  }

  if (!organization) {
    return <div className="p-8 text-center text-gray-500">Organisation indisponible.</div>;
  }

  const workspace = resolveWorkspace({
    sector: organization.sector,
    profession: organization.profession,
    country: organization.country,
  });

  if (workspace.type === 'paramedical') {
    // Agenda prêt dès la première connexion (lieu, séances types, horaires).
    await prepareStarterPractice(organization.id, user.id);
    const data = await getPracticeDashboardAction();
    
    return (
      <ParamedicalPracticeDashboard 
        workspace={workspace}
        organization={organization}
        data={data}
      />
    );
  }

  const [dashboardStats, months, operationsMetrics] = await Promise.all([
    getProfessionalStatsAction(user.organizationId),
    // Graphique calculé en SQL (6 derniers mois) : plus de chargement de toutes les affaires.
    dashboardService.getWonDealsRevenueByMonth(user.organizationId),
    workspace.type === 'field_service'
      ? getFieldServiceDashboardMetrics(user.organizationId)
      : Promise.resolve(undefined),
  ]);
  
  const stats = {
    clients: dashboardStats.clients,
    activeDeals: dashboardStats.activeDeals,
    ongoingTasks: dashboardStats.pendingTasks,
    revenue: dashboardStats.totalRevenue,
    paidInvoicesCount: dashboardStats.paidInvoices,
  };

  if (workspace.type === 'field_service') {
    return (
      <FieldServiceDashboard
        workspace={workspace}
        organization={organization}
        stats={stats}
        operationsMetrics={operationsMetrics}
        chartData={months}
      />
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Tableau de bord</h1>
      
      <div data-tour="dashboard-overview">
        <DashboardStats 
          clientsCount={stats.clients}
          activeDealsCount={stats.activeDeals}
          ongoingTasksCount={stats.ongoingTasks}
          totalRevenue={stats.revenue}
          paidInvoicesCount={stats.paidInvoicesCount}
        />
      </div>

      <div className="mt-8" data-tour="dashboard-activities" data-guide-title="Évolution des affaires gagnées" data-guide-text="Ce graphique répartit les montants des affaires gagnées sur les six derniers mois, selon leur date de mise à jour.">
        <DashboardChart data={months} />
      </div>
    </div>
  );
}
