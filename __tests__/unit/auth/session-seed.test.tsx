// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { Organization, User } from '@/lib/data/interfaces';

const actions = vi.hoisted(() => ({
  getSessionAction: vi.fn(async () => ({ user: { id: 'from-action', name: 'Action' } })),
  getOrganizationAction: vi.fn(async () => null),
}));
vi.mock('@/app/actions/session', () => actions);
vi.mock('@/lib/auth/client', () => ({
  authClient: { useSession: () => ({ data: { user: { id: 'provider-1' } } }) },
}));

import { AuthProvider, SessionSeed, useAuth } from '@/components/auth/AuthContext';

function Probe() {
  const { user, organization, isLoading } = useAuth();
  return <p>{isLoading ? 'loading' : `${user?.name ?? 'none'} / ${organization?.name ?? 'none'}`}</p>;
}

describe('SessionSeed', () => {
  it('uses the profile read by the server layout without calling server actions', async () => {
    const user = { id: 'u1', name: 'Soufiane' } as unknown as User;
    const organization = { id: 'o1', name: 'Atelier' } as unknown as Organization;
    render(
      <AuthProvider>
        <SessionSeed user={user} organization={organization} />
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByText('Soufiane / Atelier')).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(actions.getSessionAction).not.toHaveBeenCalled();
  });

  it('still loads the profile through the server action when nothing was seeded', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('Action / none')).toBeTruthy());
    expect(actions.getSessionAction).toHaveBeenCalledTimes(1);
  });
});
