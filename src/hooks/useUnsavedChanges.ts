'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const MESSAGE = 'Des modifications ne sont pas enregistrées. Quitter quand même ?';

/**
 * Protège un formulaire long contre la perte de saisie : avertissement du
 * navigateur à la fermeture ou au rechargement, et confirmation avant de
 * suivre un lien interne tant que la saisie n'est pas enregistrée.
 */
export function useUnsavedChanges() {
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    // Liens internes (navigation côté client) : confirmation explicite.
    const onClick = (event: MouseEvent) => {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!anchor || anchor.getAttribute('target') === '_blank') return;
      const href = anchor.getAttribute('href') ?? '';
      if (href.startsWith('#')) return;
      if (!window.confirm(MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);

  const markDirty = useCallback(() => setDirty(true), []);
  const markSaved = useCallback(() => { dirtyRef.current = false; setDirty(false); }, []);
  return { dirty, markDirty, markSaved };
}
