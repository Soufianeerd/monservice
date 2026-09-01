import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ParamedicalPracticeDashboard from '@/components/dashboard/ParamedicalPracticeDashboard';
import { GENERIC_WORKSPACE_CONFIG } from '@/lib/workspaces/generic/config';
import { getParamedicalWorkspaceConfig } from '@/lib/workspaces/paramedical/config';

describe('ParamedicalPracticeDashboard', () => {
  const mockOrganization = {
    id: 'org-123',
    name: 'Mon Cabinet Test',
    address: '12 rue de la Paix',
    city: 'Paris',
    postalCode: '75000',
  } as any;

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
    expect(screen.getByText("Aujourd'hui")).toBeDefined();
    
    // Label humain
    expect(screen.getByText('Masseur-Kinésithérapeute')).toBeDefined();
    
    // Links
    expect(screen.getByText('Agenda')).toBeDefined();
    expect(screen.getByText('Tâches')).toBeDefined();
    expect(screen.getByText('Facturation')).toBeDefined();
    expect(screen.getByText('Organisation')).toBeDefined();
    
    // Tours
    const overview = document.querySelector('[data-tour="dashboard-overview"]');
    expect(overview).toBeDefined();
    const activities = document.querySelector('[data-tour="dashboard-activities"]');
    expect(activities).toBeDefined();
  });

  it('renders health base correctly without profession', () => {
    const healthConfig = { ...GENERIC_WORKSPACE_CONFIG, type: 'paramedical', label: undefined } as any;
    render(
      <ParamedicalPracticeDashboard 
        workspace={healthConfig} 
        organization={mockOrganization} 
        data={emptyData} 
      />
    );
    expect(screen.getByText('Espace Paramédical')).toBeDefined();
  });

  it('displays tasks when present', () => {
    render(
      <ParamedicalPracticeDashboard 
        workspace={getParamedicalWorkspaceConfig('physiotherapist')} 
        organization={mockOrganization} 
        data={tasksData} 
      />
    );
    expect(screen.getByText('Faire bilan')).toBeDefined();
    expect(screen.getByText('Rappeler M. Dupont')).toBeDefined();
    // 2 tasks
    expect(screen.getByText('2 tâches ouvertes')).toBeDefined();
  });

  it('displays empty state correctly', () => {
    render(
      <ParamedicalPracticeDashboard 
        workspace={getParamedicalWorkspaceConfig('physiotherapist')} 
        organization={mockOrganization} 
        data={emptyData} 
      />
    );
    expect(screen.getByText('Aucune tâche ouverte.')).toBeDefined();
    expect(screen.getByText('Voir les tâches')).toBeDefined();
  });

  it('does not display unwanted strings', () => {
    const { container } = render(
      <ParamedicalPracticeDashboard 
        workspace={getParamedicalWorkspaceConfig('physiotherapist')} 
        organization={mockOrganization} 
        data={tasksData} 
      />
    );
    
    const html = container.innerHTML;
    expect(html).not.toContain('Clients');
    expect(html).not.toContain('Deals');
    expect(html).not.toContain('Patients');
    expect(html).not.toContain('Rendez-vous');
    expect(html).not.toContain('Séances aujourd’hui');
  });
});
