import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/(dashboard)/dashboard/page';

// Mocking actions
vi.mock('@/app/actions/session', () => ({
  getSessionAction: vi.fn(),
  getOrganizationAction: vi.fn(),
}));

vi.mock('@/app/actions/dashboard.actions', () => ({
  getProfessionalStatsAction: vi.fn(),
}));

vi.mock('@/app/actions/deal.actions', () => ({
  findAllAction: vi.fn(),
}));

vi.mock('@/app/actions/practice-dashboard.actions', () => ({
  getPracticeDashboardAction: vi.fn(),
}));

// Mock components to avoid deep rendering issues
vi.mock('@/components/crm/DashboardStats', () => ({
  default: () => <div data-testid="dashboard-stats">Dashboard Stats</div>,
}));

vi.mock('@/components/crm/DashboardChart', () => ({
  default: () => <div data-testid="dashboard-chart">Dashboard Chart</div>,
}));

vi.mock('@/components/dashboard/ParamedicalPracticeDashboard', () => ({
  default: () => <div data-testid="paramedical-dashboard">Paramedical Dashboard</div>,
}));

import { getSessionAction, getOrganizationAction } from '@/app/actions/session';
import { getProfessionalStatsAction } from '@/app/actions/dashboard.actions';
import { findAllAction as getDealsAction } from '@/app/actions/deal.actions';
import { getPracticeDashboardAction } from '@/app/actions/practice-dashboard.actions';

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders generic dashboard and calls correct actions for generic workspace', async () => {
    vi.mocked(getSessionAction).mockResolvedValue({ user: { organizationId: 'org-1' } } as any);
    vi.mocked(getOrganizationAction).mockResolvedValue({ sector: 'other', profession: null } as any);
    vi.mocked(getProfessionalStatsAction).mockResolvedValue({
      clients: 0,
      activeDeals: 0,
      pendingTasks: 0,
      totalRevenue: 0,
      paidInvoices: 0
    } as any);
    vi.mocked(getDealsAction).mockResolvedValue([]);

    const Page = await (DashboardPage as any)();
    render(Page);

    expect(screen.getByTestId('dashboard-stats')).toBeDefined();
    expect(screen.getByTestId('dashboard-chart')).toBeDefined();
    expect(screen.queryByTestId('paramedical-dashboard')).toBeNull();

    expect(getProfessionalStatsAction).toHaveBeenCalled();
    expect(getDealsAction).toHaveBeenCalled();
    expect(getPracticeDashboardAction).not.toHaveBeenCalled();
  });

  it('renders paramedical dashboard and calls correct actions for paramedical workspace', async () => {
    vi.mocked(getSessionAction).mockResolvedValue({ user: { organizationId: 'org-1' } } as any);
    vi.mocked(getOrganizationAction).mockResolvedValue({ sector: 'health', profession: 'physiotherapist' } as any);
    vi.mocked(getPracticeDashboardAction).mockResolvedValue({ openTaskCount: 0, nextTasks: [] } as any);

    const Page = await (DashboardPage as any)();
    render(Page);

    expect(screen.getByTestId('paramedical-dashboard')).toBeDefined();
    expect(screen.queryByTestId('dashboard-stats')).toBeNull();
    expect(screen.queryByTestId('dashboard-chart')).toBeNull();

    expect(getPracticeDashboardAction).toHaveBeenCalled();
    expect(getProfessionalStatsAction).not.toHaveBeenCalled();
    expect(getDealsAction).not.toHaveBeenCalled();
  });
});
