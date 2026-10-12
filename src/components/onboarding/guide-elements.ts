import { describeControl, type ControlHelp, controlLabel } from './definitions/control-help';
import type { PageHelp } from './definitions/page-help';
import type { HelpWorkflow } from './definitions/workflows';
import type { WorkspaceType } from '@/lib/workspaces/types';

export interface GuideElement extends ControlHelp { element: HTMLElement; key: number }
const keys = new WeakMap<HTMLElement, number>();
let nextKey = 0;
function keyOf(element: HTMLElement) {
  if (!keys.has(element)) keys.set(element, ++nextKey);
  return keys.get(element)!;
}

export function isGuideVisible(element: HTMLElement) {
  if (element.closest('[data-guide-ui], [hidden], [aria-hidden="true"], [inert]')) return false;
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    if (node.parentElement instanceof HTMLDetailsElement && !node.parentElement.open && node.tagName !== 'SUMMARY') return false;
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
  }
  return true;
}

export function activeGuideForm(): HTMLElement | null {
  // Les formulaires plus anciens en fenêtre bénéficient aussi du suivi, même sans annotation.
  const modal = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] form, [class~="fixed"][class~="inset-0"] form')).filter(isGuideVisible).at(-1);
  return modal || Array.from(document.querySelectorAll<HTMLElement>('[data-guide-form]:not([data-guide-inline])')).filter(isGuideVisible).at(-1) || null;
}

export function collectGuideElements(path: string, type: WorkspaceType, help: PageHelp, form?: HTMLElement | null): GuideElement[] {
  const root = form || document.querySelector('main');
  if (!root) return [];
  const result: GuideElement[] = [];
  const seen = new Set<HTMLElement>();
  const add = (element: HTMLElement, content?: ControlHelp) => {
    if (seen.has(element) || !isGuideVisible(element)) return;
    seen.add(element);
    result.push({ ...(content || describeControl(element, path, type)), element, key: keyOf(element) });
  };
  if (!form) for (const step of help.steps) {
    const element = document.querySelector<HTMLElement>(step.target);
    if (element && root.contains(element) && element.matches('button, a, input, select, textarea, [data-guide-title], [data-guide="dashboard-tasks"]')) {
      add(element, { ...describeControl(element, path, type), title: step.title, text: step.text });
    }
  }
  root.querySelectorAll<HTMLElement>('[data-guide-title], button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"], [contenteditable="true"]').forEach(element => add(element));
  if (!form) document.querySelector('header')?.querySelectorAll<HTMLElement>('button, a[href], [role="button"]').forEach(element => add(element));
  return form ? [...result.filter(step => step.action !== 'save'), ...result.filter(step => step.action === 'save')] : result;
}

export function workflowEntry(steps: GuideElement[], workflow: HelpWorkflow): GuideElement | undefined {
  if (workflow.id === 'facture-patient-rapide') return steps.find(step => controlLabel(step.element) === 'Consulter') || steps.find(step => step.element.matches('input'));
  if (!workflow.entry) return undefined;
  return steps.find(step => controlLabel(step.element).toLocaleLowerCase('fr').includes(workflow.entry!.toLocaleLowerCase('fr')));
}
