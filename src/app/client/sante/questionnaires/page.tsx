'use server';

import Link from 'next/link';
import { requirePatientPortalAccess } from '@/lib/patient-portal/auth';
import { patientPortalService } from '@/lib/services/patient-portal.service';
import { ClipboardList, ChevronLeft, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import QuestionnaireRunner from '@/components/patient-portal/QuestionnaireRunner';

export default async function PatientPortalQuestionnairesPage() {
  const portalCtx = await requirePatientPortalAccess();
  const assignments = await patientPortalService.listQuestionnairesForPatient(
    portalCtx.organizationId,
    portalCtx.patientId,
  );

  const pending = assignments.filter((a) => a.status === 'assigned');
  const submitted = assignments.filter((a) => a.status === 'submitted');

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <Link
          href="/client/sante"
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 mb-2"
        >
          <ChevronLeft className="w-4 h-4" /> Retour au suivi santé
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Questionnaires & Auto-évaluations</h1>
        <p className="text-sm text-slate-500">
          Remplissez les formulaires demandés par votre praticien pour préparer vos consultations ou suivre l'évolution de vos soins.
        </p>
      </div>

      {/* Pending Questionnaires */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-600" />
          À compléter ({pending.length})
        </h2>

        {pending.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-teal-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">Aucun questionnaire en attente</p>
            <p className="text-xs text-slate-500 mt-1">Vous êtes à jour dans vos réponses !</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pending.map((assignment) => (
              <div
                key={assignment.id}
                className="bg-white rounded-2xl border border-amber-200/80 p-6 shadow-sm space-y-5"
              >
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {assignment.templateName || 'Questionnaire de santé'}
                      </h3>
                      {assignment.templateDescription && (
                        <p className="text-xs text-slate-600 mt-1">{assignment.templateDescription}</p>
                      )}
                    </div>
                    {assignment.dueAt && (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        À rendre avant le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(assignment.dueAt))}
                      </span>
                    )}
                  </div>
                </div>

                <QuestionnaireRunner assignment={assignment} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submitted History */}
      {submitted.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-600" />
            Questionnaires transmis ({submitted.length})
          </h2>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
            {submitted.map((assignment) => (
              <div key={assignment.id} className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {assignment.templateName || 'Questionnaire'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Transmis le{' '}
                      {assignment.submittedAt
                        ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(
                            new Date(assignment.submittedAt),
                          )
                        : '-'}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Transmis au praticien
                  </span>
                </div>

                {/* Readonly preview */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                  <p className="font-semibold text-slate-700 mb-2">Réponses enregistrées :</p>
                  {assignment.templateSchema?.fields.map((f) => (
                    <div key={f.id} className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-slate-200/50 last:border-none">
                      <span className="text-slate-600">{f.label} :</span>
                      <span className="font-medium text-slate-900">
                        {String(assignment.answers?.[f.id] ?? '-')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
