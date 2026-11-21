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

/** Données de la page. Pas de transaction de lecture commune ici : les actions
 * appelées résolvent elles-mêmes l'identité (requireProfessional), ce qui ne doit
 * pas se faire à l'intérieur d'un lot partagé (voir src/lib/db/read-scope.ts). */
async function loadDashboard() {
  // Identité et organisation d'abord, hors transaction : ce sont des promesses
  // partagées (cache de requête) avec le layout.
  const [{ user }, organization] = await Promise.all([
    getSessionAction(),
    getOrganizationAction(),
  ]);
  if (!user?.organizationId) return { kind: 'loading' as const };
  if (!organization) return { kind: 'unavailable' as const };
  const organizationId = user.organizationId;

  const workspace = resolveWorkspace({
    sector: organization.sector,
    profession: organization.profession,
    country: organization.country,
  });

  if (workspace.type === 'paramedical') {
    return { kind: 'paramedical' as const, user, organization, workspace, data: await getPracticeDashboardAction() };
  }

  const [dashboardStats, months, operationsMetrics] = await Promise.all([
    getProfessionalStatsAction(organizationId),
    // Graphique calculé en SQL (6 derniers mois) : plus de chargement de toutes les affaires.
    dashboardService.getWonDealsRevenueByMonth(organizationId),
    workspace.type === 'field_service'
      ? getFieldServiceDashboardMetrics(organizationId)
      : Promise.resolve(undefined),
  ]);
  return { kind: 'business' as const, organization, workspace, dashboardStats, months, operationsMetrics };
}

export default async function DashboardPage() {
  const loaded = await loadDashboard();

  if (loaded.kind === 'loading') {
    return <div className="p-8 text-center text-gray-500">Chargement du dashboard...</div>;
  }

  if (loaded.kind === 'unavailable') {
    return <div className="p-8 text-center text-gray-500">Organisation indisponible.</div>;
  }

  if (loaded.kind === 'paramedical') {
    // Agenda prêt dès la première connexion (lieu, séances types, horaires).
    // Écriture : hors de la transaction de lecture.
    await prepareStarterPractice(loaded.organization.id, loaded.user.id);

    return (
      <ParamedicalPracticeDashboard 
        workspace={loaded.workspace}
        organization={loaded.organization}
        data={loaded.data}
      />
    );
  }

  const { organization, workspace, dashboardStats, months, operationsMetrics } = loaded;
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
