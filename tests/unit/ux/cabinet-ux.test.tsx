import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ContextualHelp from '@/components/onboarding/ContextualHelp';
import ProfilePage from '@/app/(dashboard)/parametres/profil/page';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';
import { AvailabilityManager } from '@/components/scheduling/AvailabilityManager';
import PatientList from '@/components/patients/PatientList';
import { useAuth } from '@/components/auth/AuthContext';
import { authClient } from '@/lib/auth/client';
import { listPatientsAction } from '@/app/actions/patient-registry.actions';

const state = vi.hoisted(() => ({ path: '/patients', setReference: vi.fn(), setFloating: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => state.path, useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@floating-ui/react', () => ({
  useFloating: () => ({ refs: { setReference: state.setReference, setFloating: state.setFloating }, floatingStyles: {} }),
  offset: vi.fn(), flip: vi.fn(), shift: vi.fn(), autoUpdate: (_target: Element, _floating: Element, update: () => void) => { update(); return vi.fn(); },
}));
vi.mock('@/components/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/lib/auth/client', () => ({ authClient: { getSession: vi.fn(), requestPasswordReset: vi.fn() } }));
vi.mock('@/app/actions/patient-registry.actions', () => ({ listPatientsAction: vi.fn() }));
vi.mock('@/app/actions/scheduling.actions', () => ({}));

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); state.path = '/patients'; document.documentElement.dataset.theme = 'light';
  vi.mocked(useAuth).mockReturnValue({ user: { name: 'Praticien test', email: 'business-profile@monservice.invalid' }, updateUser: vi.fn() } as unknown as ReturnType<typeof useAuth>);
});

describe('Aide contextuelle du cabinet', () => {
  it('suit la navigation et réinitialise la visite sans forcer de route', () => {
    const view = render(<><a data-tour="new-patient">Nouveau patient</a><ContextualHelp /></>);
    expect(screen.getByRole('heading', { name: 'Retrouver vos patients' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Me montrer les éléments' }));
    expect(state.setReference).toHaveBeenCalledWith(document.querySelector('[data-tour="new-patient"]'));
    expect(screen.getByRole('dialog')).toHaveTextContent('Ajouter un patient');
    state.path = '/parametres/facturation';
    view.rerender(<ContextualHelp />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Votre abonnement MonService' })).toBeVisible();
    expect(screen.getByLabelText('Aide contextuelle')).toHaveTextContent('ne concernent pas les honoraires');
  });

  it('se réduit, reste disponible et respecte la préférence sur une nouvelle page', () => {
    const view = render(<ContextualHelp />);
    fireEvent.click(screen.getByLabelText('Réduire l’aide'));
    state.path = '/agenda/disponibilites'; view.rerender(<ContextualHelp />);
    expect(screen.queryByLabelText('Aide contextuelle')).toBeNull();
    fireEvent.click(screen.getByLabelText('Comprendre cette page'));
    expect(screen.getByRole('heading', { name: 'Quand pouvez-vous recevoir des patients ?' })).toBeVisible();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByLabelText('Aide contextuelle')).toBeNull();
  });
});

describe('Profil et confirmation de sécurité', () => {
  it('enregistre seulement le nom et ne permet pas d’écrire un mot de passe ou l’e-mail dans le profil métier', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({ user: { name: 'Test', email: 'profile@monservice.invalid' }, updateUser: update } as unknown as ReturnType<typeof useAuth>);
    render(<ProfilePage />);
    expect(screen.getByLabelText('Adresse e-mail de connexion')).toHaveAttribute('readonly');
    expect(document.querySelector('input[type="password"]')).toBeNull();
    fireEvent.change(screen.getByLabelText('Nom complet'), { target: { value: ' Nouveau nom ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer mon nom' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ name: 'Nouveau nom' }));
    expect(await screen.findByRole('status')).toHaveTextContent('enregistré');
  });

  it('affiche un échec au lieu d’un faux succès et permet de réessayer', async () => {
    const update = vi.fn().mockRejectedValue(new Error('Unreachable'));
    vi.mocked(useAuth).mockReturnValue({ user: { name: 'Test' }, updateUser: update } as unknown as ReturnType<typeof useAuth>);
    render(<ProfilePage />); fireEvent.click(screen.getByRole('button', { name: 'Enregistrer mon nom' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('n’a pas pu être enregistré');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: 'Enregistrer mon nom' })).toBeEnabled();
  });

  it('utilise l’identité du fournisseur pour le lien, même si le profil métier a un autre e-mail', async () => {
    vi.mocked(authClient.getSession).mockResolvedValue({ data: { user: { email: 'identity@monservice.invalid' } }, error: null } as never);
    vi.mocked(authClient.requestPasswordReset).mockResolvedValue({ data: { status: true }, error: null } as never);
    render(<ProfilePage />); fireEvent.click(screen.getByRole('button', { name: 'Recevoir le lien sécurisé' }));
    await waitFor(() => expect(authClient.requestPasswordReset).toHaveBeenCalledWith({ email: 'identity@monservice.invalid', redirectTo: `${window.location.origin}/reset-password` }));
    expect(await screen.findByRole('status')).toHaveTextContent('seulement après validation');
  });

  it('récupère un échec fournisseur sans laisser le bouton bloqué', async () => {
    vi.mocked(authClient.getSession).mockResolvedValue({ data: { user: { email: 'identity@monservice.invalid' } }, error: null } as never);
    vi.mocked(authClient.requestPasswordReset).mockRejectedValue(new Error('Provider unavailable'));
    render(<ProfilePage />); fireEvent.click(screen.getByRole('button', { name: 'Recevoir le lien sécurisé' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('n’a pas pu être envoyé');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: 'Recevoir le lien sécurisé' })).toBeEnabled();
  });
});

it('oriente le cabinet vide vers sa configuration et n’affiche pas des sélecteurs vides', () => {
  render(<AvailabilityManager practitioners={[]} locations={[]} initialRules={[]} initialExceptions={[]} />);
  expect(screen.getByRole('heading', { name: 'Préparez votre planning' })).toBeVisible();
  expect(screen.queryByRole('combobox')).toBeNull();
  expect(screen.queryByRole('button', { name: /Ajouter des horaires/ })).toBeNull();
  expect(screen.getByRole('link', { name: 'Configurer les lieux et l’équipe' })).toHaveAttribute('href', '/parametres/cabinet');
});

it('applique immédiatement le statut patient et expose un échec de recherche', async () => {
  vi.mocked(listPatientsAction).mockRejectedValue(new Error('Unavailable'));
  render(<PatientList initialData={{ rows: [], total: 0, limit: 25, offset: 0 }} />);
  fireEvent.change(screen.getByLabelText('Statut'), { target: { value: 'archived' } });
  await waitFor(() => expect(listPatientsAction).toHaveBeenCalledWith(expect.objectContaining({ active: 'archived', offset: 0 })));
  expect(await screen.findByRole('alert')).toHaveTextContent('La recherche a échoué');
});

it('bascule le thème et conserve la préférence dans le cookie de rendu serveur', () => {
  render(<ThemeSwitcher />); fireEvent.click(screen.getByLabelText('Activer le mode sombre'));
  expect(document.documentElement.dataset.theme).toBe('dark'); expect(document.cookie).toContain('monservice_theme=dark');
  fireEvent.click(screen.getByLabelText('Activer le mode clair')); expect(document.documentElement.dataset.theme).toBe('light');
});
