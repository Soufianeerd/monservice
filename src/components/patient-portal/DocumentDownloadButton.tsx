'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { getPatientSharedDocumentDownloadUrlAction } from '@/app/actions/patient-portal.actions';

export default function DocumentDownloadButton({
  documentId,
  fileName,
}: {
  documentId: string;
  fileName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    try {
      setLoading(true);
      setError(null);
      const { downloadUrl } = await getPatientSharedDocumentDownloadUrlAction(documentId);
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed', err);
      setError('Erreur lors du téléchargement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        Télécharger
      </button>
      {error && <span className="text-[11px] text-rose-600 mt-1">{error}</span>}
    </div>
  );
}
