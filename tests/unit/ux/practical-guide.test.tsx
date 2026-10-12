import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContextualHelp from '@/components/onboarding/ContextualHelp';
import { collectGuideElements, activeGuideForm } from '@/components/onboarding/guide-elements';
import { describeControl } from '@/components/onboarding/definitions/control-help';
import { getPageHelp } from '@/components/onboarding/definitions/page-help';
import { announceGuideSaved, getHelpWorkflows } from '@/components/onboarding/definitions/workflows';
import type { WorkspaceType } from '@/lib/workspaces/types';
import PatientForm from '@/components/patients/PatientForm';
import Link from 'next/link';

const state = vi.hoisted(() => ({ path: '/patients/new', type: 'paramedical' as WorkspaceType, push: vi.fn(), reference: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => state.path, useRouter: () => ({ push: state.push }) }));
vi.mock('@/hooks/useWorkspace', () => ({ useWorkspace: () => ({ type: state.type }) }));
vi.mock('@/app/actions/patient-registry.actions', () => ({ createPatientAction: vi.fn(), updatePatientAction: vi.fn() }));
vi.mock('@floating-ui/react', () => ({ useFloating: () => ({ refs: { setReference: state.reference, setFloating: vi.fn() }, floatingStyles: {} }), offset: vi.fn(), flip: vi.fn(), shift: vi.fn(), autoUpdate: (_a: Element, _b: Element, update: () => void) => { update(); return vi.fn(); } }));

beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); state.path = '/patients/new'; state.type = 'paramedical'; });
const tour = () => screen.getByRole('dialog', { name: 'Tutoriel de cette page' });
const start = () => fireEvent.click(screen.getByRole('button', { name: 'Me montrer les éléments' }));

describe('Guide pratique des formulaires', () => {
  it('pointe chaque champ réel du patient et ne guide jamais son titre', async () => {
    render(<><main><h1>Ajouter un patient</h1><PatientForm /></main><ContextualHelp /></>);
    start();
    expect(state.reference).toHaveBeenLastCalledWith(document.getElementById('patient-birth-name'));
    expect(tour()).toHaveTextContent('Nom de naissance');
    expect(tour()).toHaveTextContent('PATIENT TEST');
    await act(async () => { fireEvent.change(screen.getByLabelText(/Nom de naissance/), { target: { value: 'PATIENT TEST' } }); });
    fireEvent.click(within(tour()).getByRole('button', { name: 'Suivant' }));
    expect(state.reference).toHaveBeenLastCalledWith(document.getElementById('patient-first-birth-name'));
    expect(screen.getByLabelText(/Nom de naissance/)).toHaveValue('PATIENT TEST');
    const steps = collectGuideElements(state.path, state.type, getPageHelp(state.path), activeGuideForm());
    expect(steps.filter(step => step.action === 'fill')).toHaveLength(16);
    expect(steps.at(-1)?.title).toBe('Créer le patient');
    expect(steps.some(step => step.element.matches('h1, h2'))).toBe(false);
  });

  it('rejette les champs cachés et les contrôles de sa propre bulle', () => {
    render(<main><h1>Titre</h1><input aria-label="Visible" /><input hidden aria-label="Caché" /><input type="hidden" /><div data-guide-ui><button>Guide</button></div><details><summary>Options</summary><input aria-label="Option fermée" /></details><button disabled>Créer</button></main>);
    const steps = collectGuideElements('/clients', 'generic', getPageHelp('/clients', 'generic'));
    expect(steps.map(step => step.title)).toEqual(['Visible', 'Créer']);
    expect(steps[1].text).toContain('indisponible');
  });

  it('entre dans une fenêtre de saisie ouverte après le démarrage et suit ses nouveaux champs', async () => {
    function Page() {
      const [open, setOpen] = useState(false);
      const [lines, setLines] = useState(1);
      return <main><button type="button" onClick={() => setOpen(true)}>Nouveau devis</button>{open && <form data-guide-form="devis" onSubmit={e => e.preventDefault()}><input aria-label="Description" /><button type="button" onClick={() => setLines(lines + 1)}>Ajouter une ligne</button>{Array.from({ length: lines }, (_, i) => <input key={i} aria-label={`Prix ligne ${i + 1}`} />)}<button type="submit">Enregistrer le devis</button></form>}</main>;
    }
    render(<><Page /><ContextualHelp /></>); start();
    fireEvent.click(screen.getByRole('button', { name: 'Nouveau devis' }));
    await waitFor(() => expect(state.reference).toHaveBeenLastCalledWith(screen.getByLabelText('Description')));
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une ligne' }));
    await waitFor(() => expect(state.reference).toHaveBeenLastCalledWith(screen.getByLabelText('Prix ligne 2')));
    expect(tour()).toHaveTextContent('Prix ligne 2');
  });

  it('ne confond pas la tentative de sauvegarde avec une création réussie', async () => {
    render(<><main><form data-guide-form="test" onSubmit={e => e.preventDefault()}><input aria-label="Nom" /><button type="submit">Enregistrer</button><p role="alert">Corrigez la date</p></form></main><ContextualHelp /></>); start();
    fireEvent.submit(document.querySelector('form')!);
    expect(tour()).toHaveTextContent('En attente de confirmation');
    expect(tour()).not.toHaveTextContent('Enregistrement confirmé');
    act(() => announceGuideSaved('Le dossier est enregistré.'));
    expect(tour()).toHaveTextContent('Enregistrement confirmé');
    expect(tour()).not.toHaveTextContent('En attente');
    fireEvent.click(within(tour()).getByRole('button', { name: 'Choisir la suite' }));
    expect(screen.getByLabelText('Aide contextuelle')).toBeVisible();
  });

  it('reprend le formulaire parent après la sauvegarde d’un site intermédiaire', async () => {
    render(<><main><form data-guide-form="intervention"><input aria-label="Client" /><button type="submit">Enregistrer</button></form></main><ContextualHelp /></>); start();
    act(() => announceGuideSaved('Le site est enregistré.', true));
    expect(tour()).toHaveTextContent('Enregistrement confirmé');
    fireEvent.click(within(tour()).getByRole('button', { name: 'Reprendre le formulaire' }));
    await waitFor(() => expect(tour()).toHaveTextContent('Client'));
    expect(tour()).not.toHaveTextContent('Enregistrement confirmé');
  });

  it('conserve le parcours lors du passage de la liste au formulaire', async () => {
    state.path = '/patients';
    const view = render(<><main><Link href="/patients/new" data-tour="new-patient">Ajouter un patient</Link></main><ContextualHelp /></>);
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un patient, champ par champ' }));
    expect(state.push).toHaveBeenCalledWith('/patients/new');
    state.path = '/patients/new';
    view.rerender(<><main><PatientForm /></main><ContextualHelp /></>);
    await waitFor(() => expect(tour()).toHaveTextContent('Nom de naissance'));
    expect(tour()).toHaveTextContent('Ajouter un patient, champ par champ');
  });

  it('décrit les anciens champs sans association htmlFor sans prendre le libellé voisin', () => {
    render(<main><div><label>Prix unitaire HT</label><div><input data-testid="prix" /></div></div><div><label>TVA (%)</label><input data-testid="tva" /></div></main>);
    expect(describeControl(screen.getByTestId('prix'), '/facturation/devis/nouveau', 'generic').text).toContain('50 €');
    expect(describeControl(screen.getByTestId('tva'), '/facturation/devis/nouveau', 'generic').text).toContain('taux applicable');
  });
});

describe('Parcours adaptés aux trois univers', () => {
  it.each(['paramedical', 'generic', 'field_service'] as const)('propose devis, prestations et tâches pour %s', type => {
    const ids = getHelpWorkflows(type).map(task => task.id);
    expect(ids).toEqual(expect.arrayContaining(['devis', 'prestation', 'tâche']));
    expect(ids).toContain(type === 'paramedical' ? 'patient' : 'client');
    expect(ids.includes('intervention')).toBe(type === 'field_service');
    expect(ids.includes('praticien')).toBe(type === 'paramedical');
  });
  it('distingue la facture avec catalogue du parcours rapide du dossier patient', () => {
    const workflows = getHelpWorkflows('paramedical');
    expect(workflows.find(task => task.id === 'facture-patient')?.href).toBe('/facturation/factures/new');
    const task = workflows.find(task => task.id === 'facture-patient-rapide')!;
    expect(task.href).toBe('/patients');
    expect(task.entryText).toContain('Factures & Règlements');
  });
  it('explique une carte de tableau de bord avec sa propre cible', () => {
    render(<main><div data-guide-title="À traiter" data-guide-text="Vos rappels et leurs échéances.">0</div><h1>Tableau de bord</h1></main>);
    const steps = collectGuideElements('/dashboard', 'generic', getPageHelp('/dashboard', 'generic'));
    expect(steps).toHaveLength(1);
    expect(steps[0].title).toBe('À traiter');
    expect(steps[0].text).toContain('échéances');
    expect(steps[0].action).toBe('read');
  });
  it('distingue l’annulation d’une intervention de la fermeture de son formulaire', () => {
    render(<main><button data-testid="cancel-operation" type="button">Annuler</button><form><button data-testid="cancel-form" type="button">Annuler</button></form></main>);
    expect(describeControl(screen.getByTestId('cancel-operation'), '/operations/test', 'field_service').text).toContain('confirmation d’annulation');
    expect(describeControl(screen.getByTestId('cancel-form'), '/operations/test', 'field_service').text).toContain('ferme le formulaire');
  });
});
