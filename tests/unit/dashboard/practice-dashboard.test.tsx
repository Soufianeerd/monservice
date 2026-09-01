import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ParamedicalPracticeDashboard from '@/components/dashboard/ParamedicalPracticeDashboard';
import { getParamedicalWorkspaceConfig } from '@/lib/workspaces/paramedical/config';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import { PracticeDashboardOrganization } from '@/components/dashboard/ParamedicalPracticeDashboard';

describe('ParamedicalPracticeDashboard', () => {
  const mockOrganization = {
    name: 'Mon Cabinet Test',
    address: '12 rue de la Paix',
    city: 'Paris',
    postalCode: '75000',
    phone: '0102030405'
  } satisfies PracticeDashboardOrganization;

  const emptyData = {
    openTaskCount: 0,
    nextTasks: []
  };

  const tasksData = {
    openTaskCount: 2,
    nextTasks: [
      { id: '1', title: 'Faire bilan', dueDate: '2026-10-01', status: 'pending', priority: 'high' },
      { id: '2', title: 'Rappeler M. Dupont', dueDate: null, status: 'in_progress', priority: 'medium' }
    ]
  };

  it('renders base elements correctly', () => {
    render(
      <ParamedicalPracticeDashboard 
        workspace={getParamedicalWorkspaceConfig('physiotherapist')} 
        organization={mockOrganization} 
        data={tasksData} 
      />
    );
    
    // Titre "Aujourd'hui"
    expect(screen.getByText("Aujourd'hui")).toBeInTheDocument();
    
    // Label humain
    expect(screen.getByText('Masseur-Kinésithérapeute')).toBeInTheDocument();
    
    // Links
    expect(screen.getByText('Agenda')).toBeInTheDocument();
    expect(screen.getByText('Tâches')).toBeInTheDocument();
    expect(screen.getByText('Facturation')).toBeInTheDocument();
    expect(screen.getByText('Organisation')).toBeInTheDocument();
    
    // Tours
    const overview = document.querySelector('[data-tour="dashboard-overview"]');
    expect(overview).toBeInTheDocument();
    const activities = document.querySelector('[data-tour="dashboard-activities"]');
    expect(activities).toBeInTheDocument();
  });

  it('renders health base correctly without profession', () => {
    const workspace = resolveWorkspace({ sector: 'health', profession: null });
    if (workspace.type !== 'paramedical') throw new Error('Expected paramedical workspace');
    
    render(
      <ParamedicalPracticeDashboard 
        workspace={workspace} 
        organization={mockOrganization} 
        data={emptyData} 
      />
    );
    expect(screen.getByText('Espace Paramédical')).toBeInTheDocument();
  });

  it('displays tasks when present', () => {
    render(
      <ParamedicalPracticeDashboard 
        workspace={getParamedicalWorkspaceConfig('physiotherapist')} 
        organization={mockOrganization} 
        data={tasksData} 
      />
    );
    expect(screen.getByText('Faire bilan')).toBeInTheDocument();
    expect(screen.getByText('Rappeler M. Dupont')).toBeInTheDocument();
    // 2 tasks
    expect(screen.getByText('2 tâches ouvertes')).toBeInTheDocument();
  });

  it('displays empty state correctly', () => {
    render(
      <ParamedicalPracticeDashboard 
        workspace={getParamedicalWorkspaceConfig('physiotherapist')} 
        organization={mockOrganization} 
        data={emptyData} 
      />
    );
    expect(screen.getByText('Aucune tâche ouverte.')).toBeInTheDocument();
    expect(screen.getByText('Voir les tâches')).toBeInTheDocument();
  });

  it('does not display unwanted strings', () => {
    const { container } = render(
      <ParamedicalPracticeDashboard 
        workspace={getParamedicalWorkspaceConfig('physiotherapist')} 
        organization={mockOrganization} 
        data={tasksData} 
      />
    );
    
    expect(screen.queryByText('Clients')).not.toBeInTheDocument();
    expect(screen.queryByText('Deals')).not.toBeInTheDocument();
    expect(screen.queryByText('Patients')).not.toBeInTheDocument();
    expect(screen.queryByText('Rendez-vous')).not.toBeInTheDocument();
    expect(screen.queryByText('Séances aujourd’hui')).not.toBeInTheDocument();
  });
});
