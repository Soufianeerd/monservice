'use server';

import Link from 'next/link';
import { requirePatientPortalAccess } from '@/lib/patient-portal/auth';
import { patientPortalService } from '@/lib/services/patient-portal.service';
import { FileText, ChevronLeft, ShieldCheck, FileCheck, Calendar } from 'lucide-react';
import DocumentDownloadButton from '@/components/patient-portal/DocumentDownloadButton';

export default async function PatientPortalDocumentsPage() {
  const portalCtx = await requirePatientPortalAccess();
  const documents = await patientPortalService.getSharedDocumentsForPortal(
    portalCtx.organizationId,
    portalCtx.patientId,
  );

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'report':
        return 'Compte-rendu de bilan';
      case 'prescription':
        return 'Prescription / Ordonnance';
      case 'assessment':
        return 'Évaluation clinique';
      case 'certificate':
        return 'Certificat';
      case 'other':
      default:
        return 'Autre document';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Back button & Title */}
      <div>
        <Link
          href="/client/sante"
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 mb-2"
        >
          <ChevronLeft className="w-4 h-4" /> Retour au suivi santé
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Documents Médicaux Partagés</h1>
        <p className="text-sm text-slate-500">
          Téléchargez en toute sécurité vos comptes-rendus, bilans et attestations partagés par votre praticien.
        </p>
      </div>

      {/* Document List */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">Aucun document partagé pour le moment</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Lorsque votre praticien partagera un bilan ou un compte-rendu, il apparaîtra ici avec un lien de téléchargement sécurisé.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              {documents.length} document{documents.length > 1 ? 's' : ''} disponible{documents.length > 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-teal-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Liens signés temporaires (60s)
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-teal-50 text-teal-700 rounded-lg shrink-0 mt-0.5">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{doc.title}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {getCategoryLabel(doc.category)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                      <span>Fichier : {doc.fileName} ({formatBytes(doc.sizeBytes)})</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(doc.createdAt))}
                      </span>
                    </p>
                  </div>
                </div>

                <DocumentDownloadButton documentId={doc.id} fileName={doc.fileName} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
