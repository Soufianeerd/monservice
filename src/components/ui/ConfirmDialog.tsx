'use client';

import { useCallback, useId, useRef, useSyncExternalStore } from 'react';
import { useDialogKeyboard } from '@/hooks/useDialogKeyboard';

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
}

interface PendingConfirm extends ConfirmOptions {
  message: string;
  resolve: (value: boolean) => void;
}

let pending: PendingConfirm | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Accessible replacement for window.confirm(). Resolves to true when the
 * user confirms, false when they cancel, press Escape or click outside.
 * Falls back to false when no <ConfirmHost /> is mounted.
 */
export function askConfirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  if (listeners.size === 0) return Promise.resolve(false);
  pending?.resolve(false);
  return new Promise<boolean>((resolve) => {
    pending = { message, ...options, resolve };
    emit();
  });
}

function settle(value: boolean) {
  const current = pending;
  pending = null;
  emit();
  current?.resolve(value);
}

export function ConfirmHost() {
  const current = useSyncExternalStore(subscribe, () => pending, () => null);
  const panel = useRef<HTMLDivElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();
  const cancel = useCallback(() => settle(false), []);

  useDialogKeyboard(panel, current !== null, cancel, cancelButton);

  if (!current) return null;
  const danger = current.tone !== 'default';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cancel();
      }}
    >
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-gray-900">
          {current.title ?? 'Confirmation'}
        </h2>
        <p id={messageId} className="mt-2 text-sm text-gray-600">
          {current.message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelButton}
            type="button"
            onClick={cancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {current.cancelLabel ?? 'Annuler'}
          </button>
          <button
            type="button"
            onClick={() => settle(true)}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {current.confirmLabel ?? 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}
