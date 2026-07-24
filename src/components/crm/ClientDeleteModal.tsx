'use client';

import React from 'react';

interface ClientDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  clientName: string;
  associatedCounts: {
    contacts: number;
    deals: number;
    invoices: number;
    tasks: number;
  };
  isDeleting: boolean;
}

export default function ClientDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  clientName,
  associatedCounts,
  isDeleting,
}: ClientDeleteModalProps) {
  if (!isOpen) return null;

  const total = associatedCounts.contacts + associatedCounts.deals + associatedCounts.invoices + associatedCounts.tasks;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900">Confirmer la suppression</h2>
        <p className="mt-2 text-gray-600">
          Êtes-vous sûr de vouloir supprimer <strong>{clientName}</strong> ?
        </p>
        {total > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800 font-medium">
              Cette action supprimera également :
            </p>
            <ul className="mt-2 text-sm text-yellow-700 space-y-1">
              {associatedCounts.contacts > 0 && <li>• {associatedCounts.contacts} contact(s) associé(s)</li>}
              {associatedCounts.deals > 0 && <li>• {associatedCounts.deals} deal(s) associé(s)</li>}
              {associatedCounts.invoices > 0 && <li>• {associatedCounts.invoices} facture(s) associée(s)</li>}
              {associatedCounts.tasks > 0 && <li>• {associatedCounts.tasks} tâche(s) associée(s)</li>}
            </ul>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center"
          >
            {isDeleting && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}
