'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

/**
 * Écran d'exercice des droits RGPD (accès, portabilité, effacement).
 * Anomalie MS-030.
 */
export default function DonneesPersonnellesPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const router = useRouter();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { exportMyDataAction } = await import('@/app/actions/gdpr.actions');
      const result = await exportMyDataAction();

      const blob = new Blob([result.data], { type: result.contentType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Export téléchargé.');
    } catch {
      toast.error("L'export a échoué.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { deleteMyAccountAction } = await import('@/app/actions/gdpr.actions');
      const result = await deleteMyAccountAction(confirmEmail);

      if (!result.success) {
        toast.error(result.error ?? 'La suppression a échoué.');
        return;
      }

      toast.success('Votre compte a été supprimé.');
      router.push('/');
    } catch {
      toast.error('La suppression a échoué.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes données personnelles</h1>
        <p className="mt-2 text-sm text-gray-600">
          Conformément au RGPD, vous pouvez à tout moment récupérer l&apos;ensemble de vos données
          ou supprimer votre compte.
        </p>
      </div>

      <section className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900">Exporter mes données</h2>
        <p className="mt-2 text-sm text-gray-600">
          Téléchargez l&apos;intégralité de vos données au format JSON : profil, clients,
          documents, messages et tâches. Droit d&apos;accès et de portabilité (art. 15 et 20).
        </p>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          {isExporting ? 'Préparation…' : 'Télécharger mes données'}
        </button>
      </section>

      <section className="bg-white shadow rounded-lg p-6 border-l-4 border-red-500">
        <h2 className="text-lg font-medium text-gray-900">Supprimer mon compte</h2>
        <p className="mt-2 text-sm text-gray-600">
          Cette action est <strong>irréversible</strong>. Vos données personnelles, clients,
          contacts, opportunités et tâches seront définitivement effacés.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Vos <strong>documents comptables</strong> (factures émises) sont conservés de façon
          anonymisée pendant 10 ans, conformément à l&apos;obligation légale de conservation
          (art. L123-22 du Code de commerce).
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
          >
            Supprimer mon compte
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Saisissez votre adresse e-mail pour confirmer
            </label>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="votre@email.com"
              className="block w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
            />
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting || !confirmEmail}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Suppression…' : 'Confirmer la suppression définitive'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setConfirmEmail('');
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
