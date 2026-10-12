'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { CircleHelp, X } from 'lucide-react';
import { getPageHelp, PageHelp } from './definitions/page-help';
import TourSpotlight from './TourSpotlight';

export default function ContextualHelp() {
  const pathname = usePathname();
  // Une nouvelle page réinitialise les étapes et la cible, même après un guide terminé.
  return <PageGuide key={pathname} help={getPageHelp(pathname)} />;
}

function PageGuide({ help }: { help: PageHelp }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const { refs: { setReference, setFloating }, floatingStyles } = useFloating({ placement: 'bottom', middleware: [offset(12), flip(), shift({ padding: 16 })], whileElementsMounted: autoUpdate });

  const attachFloating = useCallback((node: HTMLDivElement | null) => { setFloating(node); dialogRef.current = node; }, [setFloating]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(localStorage.getItem('monservice_contextual_help') !== 'off');
  }, []);

  useEffect(() => {
    if (step === null) return;
    dialogRef.current?.focus({ preventScroll: true });
    let stopTracking: (() => void) | undefined;
    const observer = new MutationObserver(attach);
    function attach() {
      if (stopTracking) return;
      const target = document.querySelector<HTMLElement>(help.steps[step!].target);
      setReference(target);
      if (!target) return;
      observer.disconnect();
      target.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      const update = () => {
        const rect = target.getBoundingClientRect();
        setTargetRect(previous => previous && previous.x === rect.x && previous.y === rect.y && previous.width === rect.width && previous.height === rect.height ? previous : rect);
      };
      stopTracking = autoUpdate(target, document.documentElement, update, { animationFrame: true });
    }
    observer.observe(document.body, { childList: true, subtree: true });
    attach();
    return () => { observer.disconnect(); stopTracking?.(); };
  }, [step, help, setReference]);

  useEffect(() => {
    if (!open && step === null) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); setStep(null); localStorage.setItem('monservice_contextual_help', 'off'); launcherRef.current?.focus(); }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open, step]);

  function close() { setOpen(false); setStep(null); localStorage.setItem('monservice_contextual_help', 'off'); launcherRef.current?.focus(); }
  function show() { setOpen(true); setStep(null); localStorage.setItem('monservice_contextual_help', 'on'); }

  return <>
    <button ref={launcherRef} type="button" onClick={show} aria-expanded={open || step !== null} aria-label="Comprendre cette page" className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-lg"><CircleHelp className="h-5 w-5 text-indigo-600" />Aide de cette page</button>
    {open && step === null && <aside aria-label="Aide contextuelle" className="fixed bottom-20 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
      <div className="flex items-start justify-between gap-3"><h2 className="text-base font-semibold text-gray-900">{help.title}</h2><button type="button" aria-label="Réduire l’aide" onClick={close} className="p-1 text-gray-500"><X className="h-4 w-4" /></button></div>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">{help.text}</p>
      <button type="button" onClick={() => { setOpen(false); setStep(0); }} className="mt-4 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">Me montrer les éléments</button>
    </aside>}
    {step !== null && <>
      <TourSpotlight targetRect={targetRect} />
      <div ref={attachFloating} tabIndex={-1} style={targetRect ? floatingStyles : { position: 'fixed', bottom: 80, right: 16 }} role="dialog" aria-label="Tutoriel de cette page" className="z-[100] w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
        <div className="flex justify-between gap-2"><h2 className="text-sm font-semibold text-gray-900">{help.steps[step].title}</h2><button type="button" aria-label="Fermer le tutoriel" onClick={close} className="p-1 text-gray-500"><X className="h-4 w-4" /></button></div>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{help.steps[step].text}</p>
        <div className="mt-4 flex items-center justify-between"><span className="text-xs text-gray-500">{step + 1} / {help.steps.length}</span><div className="flex gap-2">{step > 0 && <button type="button" className="text-sm text-indigo-600" onClick={() => setStep(step - 1)}>Précédent</button>}<button type="button" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white" onClick={() => { setTargetRect(null); if (step + 1 < help.steps.length) setStep(step + 1); else close(); }}>{step + 1 === help.steps.length ? 'Terminer' : 'Suivant'}</button></div></div>
      </div>
    </>}
  </>;
}
