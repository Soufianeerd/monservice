'use client';

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl" data-testid="asset-label-print">
      Imprimer l’étiquette
    </button>
  );
}
