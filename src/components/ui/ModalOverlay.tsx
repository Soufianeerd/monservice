'use client';

import { useRef, type ReactNode } from 'react';
import { useDialogKeyboard } from '@/hooks/useDialogKeyboard';

interface ModalOverlayProps {
  onClose: () => void;
  className: string;
  children: ReactNode;
  labelledBy?: string;
}

/**
 * Backdrop for modal windows: dialog semantics, focus kept inside,
 * Escape closes, focus restored to the opener.
 */
export function ModalOverlay({ onClose, className, children, labelledBy }: ModalOverlayProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogKeyboard(ref, true, onClose);
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={className}>
      {children}
    </div>
  );
}
