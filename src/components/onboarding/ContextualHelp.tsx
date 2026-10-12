'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { CircleHelp, X, ChevronRight } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { getPageHelp } from './definitions/page-help';
import { getHelpWorkflows, GUIDE_SAVED_EVENT, type HelpWorkflow } from './definitions/workflows';
import { activeGuideForm, collectGuideElements, workflowEntry, type GuideElement } from './guide-elements';
import TourSpotlight from './TourSpotlight';

export default function ContextualHelp() {
  const pathname = usePathname();
  const router = useRouter();
  const workspace = useWorkspace();
  const type = workspace?.type || (pathname.startsWith('/patients') ? 'paramedical' : 'generic');
  const help = useMemo(() => getPageHelp(pathname, type), [pathname, type]);
  const workflows = useMemo(() => getHelpWorkflows(type), [type]);
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [workflow, setWorkflow] = useState<HelpWorkflow | null>(null);
  const [elements, setElements] = useState<GuideElement[]>([]);
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useState<string | null>(null);
  const [resumeAfterSave, setResumeAfterSave] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [inForm, setInForm] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const scopeRef = useRef<HTMLElement | null>(null);
  const pathRef = useRef(pathname);
  const entryRef = useRef(false);
  const currentKeyRef = useRef<number | null>(null);
  const elementsRef = useRef<GuideElement[]>([]);
  const clickedRef = useRef<HTMLElement | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const { refs: { setReference, setFloating }, floatingStyles } = useFloating({ placement: 'bottom', middleware: [offset(12), flip(), shift({ padding: 16 })], whileElementsMounted: autoUpdate });
  const attachFloating = useCallback((node: HTMLDivElement | null) => { setFloating(node); }, [setFloating]);
  const current = elements[index];
  const completed = running && saved !== null;
  const related = workflows.filter(task => task.href === pathname || (pathname !== '/dashboard' && task.href.startsWith(`${pathname}/`))).slice(0, 3);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(localStorage.getItem('monservice_contextual_help') !== 'off');
  }, []);

  useEffect(() => {
    if (pathRef.current === pathname) return;
    pathRef.current = pathname;
    scopeRef.current = null; currentKeyRef.current = null; entryRef.current = false;
    queueMicrotask(() => {
      setIndex(0); setTargetRect(null);
      if (!workflow) { setRunning(false); setOpen(localStorage.getItem('monservice_contextual_help') !== 'off'); }
    });
  }, [pathname, workflow]);

  useEffect(() => {
    if (!running || saved) return;
    let queued = false;
    let active = true;
    const refresh = () => {
      if (!active) return;
      queued = false;
      const form = activeGuideForm();
      const changedScope = form !== scopeRef.current;
      scopeRef.current = form;
      setInForm(!!form);
      const steps = collectGuideElements(pathname, type, help, form);
      let selected = currentKeyRef.current === null ? -1 : steps.findIndex(step => step.key === currentKeyRef.current);
      if (changedScope || selected < 0) selected = 0;
      if (!changedScope && clickedRef.current) {
        const previousKeys = new Set(elementsRef.current.map(step => step.key));
        const added = steps.findIndex(step => !previousKeys.has(step.key));
        if (added >= 0) { selected = added; clickedRef.current = null; }
      }
      if (!form && workflow && !entryRef.current) {
        const entry = workflowEntry(steps, workflow);
        if (entry) selected = steps.indexOf(entry);
        if (steps.length) entryRef.current = true;
      }
      currentKeyRef.current = steps[selected]?.key || null;
      elementsRef.current = steps;
      setElements(previous => previous.length === steps.length && previous.every((step, i) => step.key === steps[i].key && step.text === steps[i].text) ? previous : steps);
      setIndex(selected);
    };
    const observer = new MutationObserver(mutations => {
      if (mutations.every(mutation => (mutation.target instanceof Element ? mutation.target : mutation.target.parentElement)?.closest('[data-guide-ui]'))) return;
      if (!queued) { queued = true; queueMicrotask(refresh); }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'disabled', 'aria-hidden', 'aria-disabled', 'readonly'] });
    refresh();
    window.addEventListener('resize', refresh);
    return () => { active = false; observer.disconnect(); window.removeEventListener('resize', refresh); };
  }, [running, saved, pathname, type, help, workflow]);

  useEffect(() => {
    if (!running || saved || !current?.element.isConnected) { setReference(null); return; }
    const target = current.element;
    setReference(target);
    target.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    const update = () => {
      if (!target.isConnected) return;
      const rect = target.getBoundingClientRect();
      setTargetRect(previous => previous && previous.x === rect.x && previous.y === rect.y && previous.width === rect.width && previous.height === rect.height ? previous : rect);
    };
    return autoUpdate(target, document.documentElement, update, { animationFrame: true });
  }, [running, saved, current, setReference]);

  useEffect(() => {
    if (!running) return;
    const success = (event: Event) => {
      const detail = (event as CustomEvent<{ label: string; continueWorkflow?: boolean }>).detail;
      const label = detail?.label;
      if (!label) return;
      setSaved(label); setResumeAfterSave(!!detail.continueWorkflow); setWaiting(false); setTargetRect(null);
    };
    const submit = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('[data-guide-ui]')) return;
      setWaiting(true);
    };
    const click = (event: Event) => {
      if (!(event.target instanceof Element) || event.target.closest('[data-guide-ui]')) return;
      const control = event.target.closest<HTMLElement>('button, a[href], [role="button"], [role="tab"]');
      if (!control) return;
      clickedRef.current = control;
      if (!workflow && control instanceof HTMLAnchorElement && control.getAttribute('href')?.startsWith('/')) {
        const step = elementsRef.current.find(item => item.element === control);
        if (step) setWorkflow({ id: 'action-de-page', label: step.title, href: control.getAttribute('href')! });
      }
    };
    window.addEventListener(GUIDE_SAVED_EVENT, success);
    document.addEventListener('submit', submit, true);
    document.addEventListener('click', click, true);
    return () => { window.removeEventListener(GUIDE_SAVED_EVENT, success); document.removeEventListener('submit', submit, true); document.removeEventListener('click', click, true); };
  }, [running, workflow]);

  function close() { setOpen(false); setRunning(false); setWorkflow(null); setSaved(null); setWaiting(false); setTargetRect(null); localStorage.setItem('monservice_contextual_help', 'off'); launcherRef.current?.focus(); }
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); setRunning(false); setWorkflow(null); setSaved(null); setWaiting(false); setTargetRect(null); localStorage.setItem('monservice_contextual_help', 'off'); launcherRef.current?.focus(); }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, []);

  function start(task: HelpWorkflow | null = null) {
    scopeRef.current = null; currentKeyRef.current = null; entryRef.current = false; clickedRef.current = null;
    setWorkflow(task); setIndex(0); setSaved(null); setResumeAfterSave(false); setWaiting(false); setTargetRect(null); setOpen(false); setRunning(true);
    localStorage.setItem('monservice_contextual_help', 'on');
    if (task && task.href !== pathname) router.push(task.href);
  }
  function move(delta: number) {
    const next = index + delta;
    setWaiting(false);
    if (next >= elements.length) { setRunning(false); setOpen(true); return; }
    currentKeyRef.current = elements[next]?.key || null;
    setIndex(next); setTargetRect(null);
  }

  return <>
    <button data-guide-ui ref={launcherRef} type="button" onClick={() => { setOpen(true); setRunning(false); setWorkflow(null); setSaved(null); setTargetRect(null); localStorage.setItem('monservice_contextual_help', 'on'); }} aria-expanded={open || running} aria-label="Comprendre cette page" className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-lg"><CircleHelp className="h-5 w-5 text-indigo-600" />Aide de cette page</button>
    {open && !running && <aside data-guide-ui aria-label="Aide contextuelle" className="fixed bottom-20 right-4 z-50 max-h-[calc(100dvh-7rem)] w-96 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
      <div className="flex items-start justify-between gap-3"><h2 className="text-base font-semibold text-gray-900">{help.title}</h2><button type="button" aria-label="Réduire l’aide" onClick={close} className="p-1 text-gray-500"><X className="h-4 w-4" /></button></div>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">{help.text}</p>
      <button type="button" onClick={() => start()} className="mt-4 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">Me montrer les éléments</button>
      <p className="mt-4 text-sm font-semibold text-gray-900">Faire une action avec le guide</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">Cliquez et saisissez directement dans l’interface. Les bulles suivent les formulaires ; elles n’enregistrent rien à votre place.</p>
      <div className="mt-3 space-y-1">{related.map(task => <button key={task.id} type="button" onClick={() => start(task)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm text-indigo-700 hover:bg-indigo-50">{task.label}<ChevronRight className="h-4 w-4 shrink-0" /></button>)}</div>
      <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium text-indigo-700">Tous les parcours de prise en main</summary><div className="mt-2 space-y-1">{workflows.filter(task => !related.includes(task)).map(task => <button key={task.id} type="button" onClick={() => start(task)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm text-indigo-700 hover:bg-indigo-50">{task.label}<ChevronRight className="h-4 w-4 shrink-0" /></button>)}</div></details>
      <details className="mt-4 rounded-lg border border-gray-200 p-3 text-sm text-gray-600"><summary className="cursor-pointer font-medium text-gray-900">S’entraîner avec un exemple fictif</summary><p className="mt-2">{type === 'paramedical' ? 'Patient : PATIENT TEST, Martin, né le 01/01/1990.' : 'Client : CLIENT TEST, contact Martin Test.'} Prestation : PRESTATION TEST, quantité 1, prix 50 €, TVA 0 %. Tâche : Vérifier le dossier test.</p><p className="mt-2 text-xs">Ce sont des exemples à saisir vous-même. Quitter avant Enregistrer laisse le formulaire sans création. Si vous enregistrez, le dossier fictif apparaît dans votre activité ; ne l’envoyez pas à un vrai destinataire.</p></details>
    </aside>}
    {running && <>
      {!completed && <TourSpotlight targetRect={targetRect} />}
      <div data-guide-ui ref={attachFloating} tabIndex={-1} style={!completed && targetRect ? floatingStyles : { position: 'fixed', bottom: 80, right: 16 }} role="dialog" aria-label="Tutoriel de cette page" className="z-[100] max-h-[calc(100dvh-2rem)] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
        <div className="flex justify-between gap-2"><h2 className="text-sm font-semibold text-gray-900">{completed ? 'Enregistrement confirmé' : current?.title || 'Préparation du guide'}</h2><button type="button" aria-label="Fermer le tutoriel" onClick={close} className="p-1 text-gray-500"><X className="h-4 w-4" /></button></div>
        {workflow && <p className="mt-2 text-xs font-medium text-indigo-600">{workflow.label}</p>}
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{completed ? `${saved} Le logiciel a confirmé l’enregistrement. Retrouvez le résultat sur la page ou dans la liste correspondante.` : current ? current.text : 'Le guide attend les contrôles de la page. Si une sélection ou une configuration manque, complétez-la pour continuer.'}</p>
        {!completed && workflow?.entryText && !inForm && <p className="mt-2 text-sm text-gray-600">{workflow.entryText}</p>}
        {!completed && current?.action === 'fill' && <p className="mt-2 text-xs text-indigo-600">Remplissez ce champ, puis cliquez sur Suivant. Vous pouvez laisser un champ facultatif vide.</p>}
        {!completed && current?.action === 'click' && <p className="mt-2 text-xs text-indigo-600">Cliquez sur l’élément encadré pour l’utiliser, ou sur Suivant pour poursuivre la découverte.</p>}
        {!completed && waiting && <p role="status" className="mt-3 rounded-lg bg-indigo-50 p-2 text-xs text-indigo-700">En attente de confirmation. Si une erreur s’affiche dans le formulaire, corrigez les champs indiqués et réessayez.</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-gray-500">{completed ? 'Action enregistrée' : `${elements.length ? index + 1 : 0} / ${elements.length} éléments affichés`}</span><div className="flex gap-3">{!completed && index > 0 && <button type="button" className="text-sm text-indigo-600" onClick={() => move(-1)}>Précédent</button>}<button type="button" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white" onClick={() => { if (completed && resumeAfterSave) { scopeRef.current = null; currentKeyRef.current = null; setSaved(null); setResumeAfterSave(false); setIndex(0); } else if (completed) { setRunning(false); setOpen(true); setWorkflow(null); setSaved(null); } else move(1); }}>{completed ? resumeAfterSave ? 'Reprendre le formulaire' : 'Choisir la suite' : index + 1 >= elements.length ? 'Terminer la visite' : 'Suivant'}</button></div></div>
      </div>
    </>}
  </>;
}
