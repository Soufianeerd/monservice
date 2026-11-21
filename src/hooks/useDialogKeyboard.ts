'use client';

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('inert') && el.getAttribute('aria-hidden') !== 'true',
  );
}

/**
 * Keyboard behaviour expected from a modal dialog (WAI-ARIA APG):
 * focus moves into the dialog, Tab cycles inside it, Escape closes it,
 * and focus returns to the element that opened it.
 */
export function useDialogKeyboard(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
  initialFocus?: RefObject<HTMLElement | null>,
) {
  // Callers often pass inline closures; keep the latest one without
  // re-running the effect (which would steal focus on every render).
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const container = ref.current;
    if (!container) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const target = initialFocus?.current ?? focusableWithin(container)[0] ?? container;
    target.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (!container) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusableWithin(container);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !container.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [ref, open, initialFocus]);
}
