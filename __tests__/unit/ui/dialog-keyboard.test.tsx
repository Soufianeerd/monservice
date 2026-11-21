// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { ConfirmHost, askConfirm } from '@/components/ui/ConfirmDialog';

function Harness({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState('');
  return (
    <>
      <button>opener</button>
      <ModalOverlay onClose={() => onClose()} className="x">
        <input aria-label="nom" value={value} onChange={(e) => setValue(e.target.value)} />
        <button>valider</button>
      </ModalOverlay>
    </>
  );
}

describe('ModalOverlay', () => {
  it('moves focus inside, keeps it while typing, traps Tab and closes on Escape', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const input = screen.getByLabelText('nom');
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(document.activeElement).toBe(input);
    screen.getByText('valider').focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByText('valider'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
  });
});

describe('askConfirm', () => {
  it('resolves true on confirm and false on Escape', async () => {
    render(<ConfirmHost />);
    let result: Promise<boolean> = Promise.resolve(false);
    act(() => { result = askConfirm('Supprimer ?', { confirmLabel: 'Supprimer' }); });
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByText('Annuler'));
    act(() => { fireEvent.click(screen.getByText('Supprimer')); });
    await expect(result).resolves.toBe(true);
    act(() => { result = askConfirm('Encore ?'); });
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    await expect(result).resolves.toBe(false);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('returns false when no host is mounted', async () => {
    await expect(askConfirm('x')).resolves.toBe(false);
  });
});
