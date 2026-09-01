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
import type { User } from '@/lib/data/interfaces/user.interface';
import type { Organization } from '@/lib/data/interfaces/organization.interface';
import type { PracticeDashboardData } from '@/lib/services/practice-dashboard.service';

describe('DashboardPage', () => {
  const mockUser = {
    id: 'user-1',
    name: 'Test',
    email: 'test@test.com',
    profileType: 'professional',
    organizationId: 'org-1',
    onboardingCompleted: true,
    onboardingStep: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies User;

  const genericOrg = {
    id: 'org-1',
    name: 'Org Generic',
    industry: 'tech',
    sector: 'other',
    profession: null,
    isPublic: true,
    country: 'FR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies Organization;

  const paramedicalOrg = {
    id: 'org-1',
    name: 'Org Paramed',
    industry: 'health',
    sector: 'health',
    profession: 'physiotherapist',
    isPublic: true,
    country: 'FR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies Organization;

  const emptyPracticeData = {
    openTaskCount: 0,
    nextTasks: []
  } satisfies PracticeDashboardData;

  const genericStats = {
    clients: 0,
    activeDeals: 0,
    pendingTasks: 0,
    totalRevenue: 0,
    paidInvoices: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders generic dashboard and calls correct actions for generic workspace', async () => {
    vi.mocked(getSessionAction).mockResolvedValue({ user: mockUser });
    vi.mocked(getOrganizationAction).mockResolvedValue(genericOrg);
    vi.mocked(getProfessionalStatsAction).mockResolvedValue(genericStats as any);
    vi.mocked(getDealsAction).mockResolvedValue([]);

    const Page = await DashboardPage();
    render(Page);

    expect(screen.getByTestId('dashboard-stats')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('paramedical-dashboard')).not.toBeInTheDocument();

    expect(getProfessionalStatsAction).toHaveBeenCalled();
    expect(getDealsAction).toHaveBeenCalled();
    expect(getPracticeDashboardAction).not.toHaveBeenCalled();
  });

  it('renders paramedical dashboard and calls correct actions for paramedical workspace', async () => {
    vi.mocked(getSessionAction).mockResolvedValue({ user: mockUser });
    vi.mocked(getOrganizationAction).mockResolvedValue(paramedicalOrg);
    vi.mocked(getPracticeDashboardAction).mockResolvedValue(emptyPracticeData);

    const Page = await DashboardPage();
    render(Page);

    expect(screen.getByTestId('paramedical-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-stats')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-chart')).not.toBeInTheDocument();

    expect(getPracticeDashboardAction).toHaveBeenCalled();
    expect(getProfessionalStatsAction).not.toHaveBeenCalled();
    expect(getDealsAction).not.toHaveBeenCalled();
  });

  it('renders neutral state and skips data actions when organization is null', async () => {
    vi.mocked(getSessionAction).mockResolvedValue({ user: mockUser });
    vi.mocked(getOrganizationAction).mockResolvedValue(null);

    const Page = await DashboardPage();
    render(Page);

    expect(screen.getByText('Organisation indisponible.')).toBeInTheDocument();
    
    expect(getPracticeDashboardAction).not.toHaveBeenCalled();
    expect(getProfessionalStatsAction).not.toHaveBeenCalled();
    expect(getDealsAction).not.toHaveBeenCalled();
  });
});
