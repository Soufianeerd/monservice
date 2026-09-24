'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  XCircle,
  FileText,
  Building,
  Plus,
  Trash2,
  Edit3,
  Lock,
  Loader2,
  X,
  Phone,
  Mail,
} from 'lucide-react';
import type { FieldServiceWorkspaceConfig } from '@/lib/workspaces/types';
import {
  transitionFieldServiceWorkOrderAction,
  assignFieldServiceWorkerAction,
  unassignFieldServiceWorkerAction,
  createFieldServiceWorkReportAction,
  updateFieldServiceWorkReportAction,
  finalizeFieldServiceWorkReportAction,
} from '@/app/actions/field-service-operations.actions';

interface AssignmentItem {
  id: string;
  userId: string;
  role: string;
  isActive: boolean;
  assignedAt: string;
  removedAt: string | null;
  userName: string | null;
  userEmail: string | null;
}

interface ReportItem {
  id: string;
  authorUserId: string;
  status: string;
  summary: string;
  workPerformed: string | null;
  issuesFound: string | null;
  recommendations: string | null;
  customerNotes: string | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
}

interface HistoryItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: string | null;
  reason: string | null;
  createdAt: string;
  changedByName: string | null;
}

interface OperationDetail {
  id: string;
  organizationId: string;
  clientId: string;
  siteId: string | null;
  createdByUserId: string;
  reference: string;
  title: string;
  description: string | null;
  workType: string;
  status: string;
  priority: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  cancellationReasonCode: string | null;
  cancellationNotes: string | null;
  createdAt: string;
  updatedAt: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  siteLabel: string | null;
  siteAddressLine1: string | null;
  siteAddressLine2: string | null;
  sitePostalCode: string | null;
  siteCity: string | null;
  siteAccessInstructions: string | null;
  assignments: AssignmentItem[];
  reports: ReportItem[];
  history: HistoryItem[];
}

interface OrgProfessional {
  id: string;
  name: string | null;
  email: string | null;
}

interface OperationDetailClientProps {
  workspace: FieldServiceWorkspaceConfig;
  initialOperation: OperationDetail;
  orgProfessionals: OrgProfessional[];
}

const statusBadgeStyles: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  draft: { label: 'Brouillon', bg: 'bg-gray-100 text-gray-700 border-gray-200', text: 'text-gray-700', icon: FileText },
  scheduled: { label: 'Planifié', bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700', icon: Calendar },
  in_progress: { label: 'En cours', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700', icon: PlayCircle },
  paused: { label: 'En pause', bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'text-purple-700', icon: PauseCircle },
  completed: { label: 'Terminé', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2 },
  cancelled: { label: 'Annulé', bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700', icon: XCircle },
};

const roleLabels: Record<string, string> = {
  lead: 'Responsable / Chef de chantier',
  technician: 'Technicien / Artisan',
  assistant: 'Assistant / Apprenti',
  observer: 'Observateur',
};

export default function OperationDetailClient({
  workspace,
  initialOperation,
  orgProfessionals,
}: OperationDetailClientProps) {
  const router = useRouter();
  const [operation, setOperation] = useState<OperationDetail>(initialOperation);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOperation(initialOperation);
  }, [initialOperation]);

  // Cancellation Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState<string>('customer_request');
  const [cancellationNotes, setCancellationNotes] = useState('');

  // Assign Worker Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState(orgProfessionals[0]?.id || '');
  const [assignRole, setAssignRole] = useState<'lead' | 'technician' | 'assistant' | 'observer'>('technician');

  // Report Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [reportSummary, setReportSummary] = useState('');
  const [reportWorkPerformed, setReportWorkPerformed] = useState('');
  const [reportIssuesFound, setReportIssuesFound] = useState('');
  const [reportRecommendations, setReportRecommendations] = useState('');
  const [reportCustomerNotes, setReportCustomerNotes] = useState('');

  const terminology = workspace.terminology;
  const workSingular = terminology.workSingular || 'Opération';
  const statusInfo = statusBadgeStyles[operation.status] || statusBadgeStyles.draft;
  const StatusIcon = statusInfo.icon;

  // Status transitions
  const handleTransition = (toStatus: 'draft' | 'scheduled' | 'in_progress' | 'paused' | 'completed' | 'cancelled') => {
    if (toStatus === 'cancelled') {
      setIsCancelModalOpen(true);
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const updated = await transitionFieldServiceWorkOrderAction({
          id: operation.id,
          toStatus,
        });
        const actualStartStr = updated.actualStart
          ? (typeof updated.actualStart === 'string' ? updated.actualStart : updated.actualStart.toISOString())
          : null;
        const actualEndStr = updated.actualEnd
          ? (typeof updated.actualEnd === 'string' ? updated.actualEnd : updated.actualEnd.toISOString())
          : null;
        setOperation(prev => ({ ...prev, status: updated.status, actualStart: actualStartStr, actualEnd: actualEndStr }));
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur lors du changement de statut');
      }
    });
  };

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const updated = await transitionFieldServiceWorkOrderAction({
          id: operation.id,
          toStatus: 'cancelled',
          cancellationReasonCode: cancellationReason as 'customer_request' | 'unavailable' | 'duplicate' | 'quote_not_accepted' | 'scheduling_issue' | 'technical_impossibility' | 'other',
          cancellationNotes: cancellationNotes || null,
        });
        const actualEndStr = updated.actualEnd
          ? (typeof updated.actualEnd === 'string' ? updated.actualEnd : updated.actualEnd.toISOString())
          : null;
        setOperation(prev => ({
          ...prev,
          status: updated.status,
          cancellationReasonCode: updated.cancellationReasonCode,
          cancellationNotes: updated.cancellationNotes,
          actualEnd: actualEndStr,
        }));
        setIsCancelModalOpen(false);
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur lors de l’annulation');
      }
    });
  };

  // Assignment handlers
  const handleAssignWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserId) return;
    setError(null);

    startTransition(async () => {
      try {
        const newAssignment = await assignFieldServiceWorkerAction({
          workOrderId: operation.id,
          userId: assignUserId,
          role: assignRole,
        });
        const assignedUser = orgProfessionals.find(p => p.id === assignUserId);
        setOperation(prev => ({
          ...prev,
          assignments: [
            ...prev.assignments,
            {
              id: newAssignment.id,
              userId: assignUserId,
              role: assignRole,
              isActive: true,
              assignedAt: typeof newAssignment.assignedAt === 'string' ? newAssignment.assignedAt : newAssignment.assignedAt.toISOString(),
              removedAt: null,
              userName: assignedUser?.name || 'Collaborateur',
              userEmail: assignedUser?.email || null,
            },
          ],
        }));
        setIsAssignModalOpen(false);
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur lors de l’assignation');
      }
    });
  };

  const handleUnassignWorker = (assignmentId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await unassignFieldServiceWorkerAction({ assignmentId });
        setOperation(prev => ({
          ...prev,
          assignments: prev.assignments.filter(a => a.id !== assignmentId),
        }));
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la désassignation');
      }
    });
  };

  // Report handlers
  const handleOpenNewReport = () => {
    setEditingReportId(null);
    setReportSummary('');
    setReportWorkPerformed('');
    setReportIssuesFound('');
    setReportRecommendations('');
    setReportCustomerNotes('');
    setIsReportModalOpen(true);
  };

  const handleOpenEditReport = (rep: ReportItem) => {
    if (rep.status === 'finalized') return;
    setEditingReportId(rep.id);
    setReportSummary(rep.summary);
    setReportWorkPerformed(rep.workPerformed || '');
    setReportIssuesFound(rep.issuesFound || '');
    setReportRecommendations(rep.recommendations || '');
    setReportCustomerNotes(rep.customerNotes || '');
    setIsReportModalOpen(true);
  };

  const handleSaveReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportSummary.trim()) return;
    setError(null);

    startTransition(async () => {
      try {
        if (editingReportId) {
          const updated = await updateFieldServiceWorkReportAction({
            id: editingReportId,
            summary: reportSummary.trim(),
            workPerformed: reportWorkPerformed.trim() || null,
            issuesFound: reportIssuesFound.trim() || null,
            recommendations: reportRecommendations.trim() || null,
            customerNotes: reportCustomerNotes.trim() || null,
          });
          setOperation(prev => ({
            ...prev,
            reports: prev.reports.map(r => r.id === updated.id ? {
              ...r,
              summary: updated.summary,
              workPerformed: updated.workPerformed,
              issuesFound: updated.issuesFound,
              recommendations: updated.recommendations,
              customerNotes: updated.customerNotes,
              updatedAt: typeof updated.updatedAt === 'string' ? updated.updatedAt : updated.updatedAt.toISOString(),
            } : r),
          }));
        } else {
          const created = await createFieldServiceWorkReportAction({
            workOrderId: operation.id,
            summary: reportSummary.trim(),
            workPerformed: reportWorkPerformed.trim() || null,
            issuesFound: reportIssuesFound.trim() || null,
            recommendations: reportRecommendations.trim() || null,
            customerNotes: reportCustomerNotes.trim() || null,
          });
          const currentAuthor = orgProfessionals.find(p => p.id === created.authorUserId);
          setOperation(prev => ({
            ...prev,
            reports: [
              {
                id: created.id,
                authorUserId: created.authorUserId,
                status: created.status,
                summary: created.summary,
                workPerformed: created.workPerformed,
                issuesFound: created.issuesFound,
                recommendations: created.recommendations,
                customerNotes: created.customerNotes,
                finalizedAt: null,
                createdAt: typeof created.createdAt === 'string' ? created.createdAt : created.createdAt.toISOString(),
                updatedAt: typeof created.updatedAt === 'string' ? created.updatedAt : created.updatedAt.toISOString(),
                authorName: currentAuthor?.name || 'Collaborateur',
              },
              ...prev.reports,
            ],
          }));
        }
        setIsReportModalOpen(false);
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement du rapport');
      }
    });
  };

  const handleFinalizeReport = (reportId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir finaliser ce compte-rendu ? Il deviendra permanent et non modifiable.')) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const finalized = await finalizeFieldServiceWorkReportAction({ id: reportId });
        setOperation(prev => ({
          ...prev,
          reports: prev.reports.map(r => r.id === finalized.id ? {
            ...r,
            status: 'finalized',
            finalizedAt: typeof finalized.finalizedAt === 'string' ? finalized.finalizedAt : finalized.finalizedAt?.toISOString() || null,
          } : r),
        }));
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la finalisation du rapport');
      }
    });
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8" data-testid="operation-detail">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <Link
            href="/operations"
            className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-700 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            {terminology.workPlural || 'Opérations'}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              {operation.title}
            </h1>
            <span
              data-testid="operation-reference"
              className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-mono text-xs font-bold"
            >
              {operation.reference}
            </span>
            <span
              data-testid="operation-status-badge"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.bg}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* State Machine Transition Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {operation.status === 'draft' && (
            <>
              <button
                type="button"
                data-testid="start-operation-button"
                onClick={() => handleTransition('in_progress')}
                disabled={isPending}
                className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
              >
                <PlayCircle className="w-4 h-4 mr-1.5" />
                Démarrer
              </button>
              <button
                type="button"
                data-testid="cancel-operation-button"
                onClick={() => handleTransition('cancelled')}
                disabled={isPending}
                className="inline-flex items-center px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition-colors border border-rose-200"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Annuler
              </button>
            </>
          )}

          {operation.status === 'scheduled' && (
            <>
              <button
                type="button"
                data-testid="start-operation-button"
                onClick={() => handleTransition('in_progress')}
                disabled={isPending}
                className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
              >
                <PlayCircle className="w-4 h-4 mr-1.5" />
                Démarrer
              </button>
              <button
                type="button"
                data-testid="cancel-operation-button"
                onClick={() => handleTransition('cancelled')}
                disabled={isPending}
                className="inline-flex items-center px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition-colors border border-rose-200"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Annuler
              </button>
            </>
          )}

          {operation.status === 'in_progress' && (
            <>
              <button
                type="button"
                data-testid="pause-operation-button"
                onClick={() => handleTransition('paused')}
                disabled={isPending}
                className="inline-flex items-center px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
              >
                <PauseCircle className="w-4 h-4 mr-1.5" />
                Mettre en pause
              </button>
              <button
                type="button"
                data-testid="complete-operation-button"
                onClick={() => handleTransition('completed')}
                disabled={isPending}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Terminer
              </button>
              <button
                type="button"
                data-testid="cancel-operation-button"
                onClick={() => handleTransition('cancelled')}
                disabled={isPending}
                className="inline-flex items-center px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition-colors border border-rose-200"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Annuler
              </button>
            </>
          )}

          {operation.status === 'paused' && (
            <>
              <button
                type="button"
                data-testid="resume-operation-button"
                onClick={() => handleTransition('in_progress')}
                disabled={isPending}
                className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
              >
                <PlayCircle className="w-4 h-4 mr-1.5" />
                Reprendre
              </button>
              <button
                type="button"
                data-testid="complete-operation-button"
                onClick={() => handleTransition('completed')}
                disabled={isPending}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Terminer
              </button>
              <button
                type="button"
                data-testid="cancel-operation-button"
                onClick={() => handleTransition('cancelled')}
                disabled={isPending}
                className="inline-flex items-center px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition-colors border border-rose-200"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Annuler
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div>{error}</div>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols): Summary, Team, Reports */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description & Cadrage */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900">Description des travaux</h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {operation.description || 'Aucune description spécifique fournie.'}
            </p>
          </div>

          {/* Équipe & Techniciens assignés */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-600" />
                  Équipe & Techniciens assignés
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Intervenants professionnels autorisés sur ce {workSingular.toLowerCase()}
                </p>
              </div>

              {operation.status !== 'completed' && operation.status !== 'cancelled' && (
                <button
                  type="button"
                  data-testid="assign-worker-button"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="inline-flex items-center px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-100 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Assigner
                </button>
              )}
            </div>

            {operation.assignments.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Aucun intervenant assigné pour le moment.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {operation.assignments.map(ass => (
                  <div key={ass.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                        {ass.userName ? ass.userName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {ass.userName || ass.userEmail || 'Utilisateur'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {roleLabels[ass.role] || ass.role}
                          {!ass.isActive && (
                            <span className="ml-2 text-rose-600 font-medium">(Désassigné)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {ass.isActive && operation.status !== 'completed' && operation.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => handleUnassignWorker(ass.id)}
                        disabled={isPending}
                        title="Retirer de l'équipe"
                        className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rapports & Comptes-rendus */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-600" />
                  Comptes-rendus d’intervention
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Rapports de fin de travaux, constats et préconisations
                </p>
              </div>

              <button
                type="button"
                data-testid="create-report-button"
                onClick={handleOpenNewReport}
                className="inline-flex items-center px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-100 text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Nouveau rapport
              </button>
            </div>

            {operation.reports.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Aucun compte-rendu rédigé pour le moment.
              </div>
            ) : (
              <div className="space-y-4">
                {operation.reports.map(rep => (
                  <div
                    key={rep.id}
                    className="p-5 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            rep.status === 'finalized'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {rep.status === 'finalized' ? (
                            <>
                              <Lock className="w-3 h-3" />
                              Finalisé (Immuable)
                            </>
                          ) : (
                            <>
                              <Edit3 className="w-3 h-3" />
                              Brouillon
                            </>
                          )}
                        </span>
                        <span className="text-xs text-gray-400">
                          par {rep.authorName || 'Professionnel'} • {new Date(rep.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>

                      {rep.status === 'draft' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditReport(rep)}
                            className="px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            data-testid="finalize-report-button"
                            onClick={() => handleFinalizeReport(rep.id)}
                            disabled={isPending}
                            className="inline-flex items-center px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                          >
                            <Lock className="w-3 h-3 mr-1" />
                            Finaliser
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-sm text-gray-800">
                      <div>
                        <span className="font-semibold block text-xs uppercase text-gray-500">Résumé :</span>
                        <p>{rep.summary}</p>
                      </div>

                      {rep.workPerformed && (
                        <div>
                          <span className="font-semibold block text-xs uppercase text-gray-500">Travaux réalisés :</span>
                          <p className="whitespace-pre-line text-xs">{rep.workPerformed}</p>
                        </div>
                      )}

                      {rep.issuesFound && (
                        <div>
                          <span className="font-semibold block text-xs uppercase text-gray-500">Problèmes constatés :</span>
                          <p className="whitespace-pre-line text-xs text-rose-800">{rep.issuesFound}</p>
                        </div>
                      )}

                      {rep.recommendations && (
                        <div>
                          <span className="font-semibold block text-xs uppercase text-gray-500">Recommandations :</span>
                          <p className="whitespace-pre-line text-xs text-blue-800">{rep.recommendations}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Client info, Site info, Planning, Timeline */}
        <div className="space-y-8">
          {/* Client Details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-primary-600" />
              Client
            </h2>
            <div className="space-y-2 text-sm">
              <div className="font-semibold text-gray-900">{operation.clientName || 'Non spécifié'}</div>
              {operation.clientEmail && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {operation.clientEmail}
                </div>
              )}
              {operation.clientPhone && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {operation.clientPhone}
                </div>
              )}
            </div>
          </div>

          {/* Site Details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-600" />
              Lieu / Site
            </h2>
            {operation.siteLabel ? (
              <div className="space-y-2 text-sm">
                <div className="font-semibold text-gray-900">{operation.siteLabel}</div>
                <div className="text-xs text-gray-600">
                  {operation.siteAddressLine1}
                  {operation.siteAddressLine2 && `, ${operation.siteAddressLine2}`}
                  <br />
                  {operation.sitePostalCode} {operation.siteCity}
                </div>
                {operation.siteAccessInstructions && (
                  <div className="mt-2 p-2.5 bg-amber-50 rounded-lg text-xs text-amber-900">
                    <span className="font-semibold block mb-0.5">Accès :</span>
                    {operation.siteAccessInstructions}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-400 italic">
                Aucun site spécifique (Travail en atelier ou non défini)
              </div>
            )}
          </div>

          {/* Planning Details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-600" />
              Planning & Horaires
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-400 uppercase font-semibold block mb-0.5">Planifié du :</span>
                <span className="text-gray-800 font-medium">
                  {operation.scheduledStart
                    ? new Date(operation.scheduledStart).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Non planifié'}
                </span>
                {operation.scheduledEnd && (
                  <span className="text-gray-800 font-medium block">
                    au{' '}
                    {new Date(operation.scheduledEnd).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>

              {operation.actualStart && (
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-gray-400 uppercase font-semibold block mb-0.5">Démarrage réel :</span>
                  <span className="text-amber-700 font-medium">
                    {new Date(operation.actualStart).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}

              {operation.actualEnd && (
                <div>
                  <span className="text-gray-400 uppercase font-semibold block mb-0.5">Fin réelle :</span>
                  <span className="text-emerald-700 font-medium">
                    {new Date(operation.actualEnd).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}

              {operation.status === 'cancelled' && (
                <div className="pt-2 border-t border-rose-100 text-rose-800">
                  <span className="font-semibold block mb-0.5">Motif d’annulation :</span>
                  <span>{operation.cancellationReasonCode}</span>
                  {operation.cancellationNotes && (
                    <p className="mt-1 italic">{operation.cancellationNotes}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Timeline & Status History */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-600" />
              Historique des statuts
            </h2>

            <div className="space-y-4" data-testid="timeline-list">
              {operation.history.map((h, idx) => (
                <div key={h.id || idx} className="flex items-start gap-3 relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-600 mt-1.5 flex-shrink-0" />
                  <div className="text-xs space-y-0.5">
                    <div className="font-semibold text-gray-900">
                      {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : `Statut : ${h.toStatus}`}
                    </div>
                    <div className="text-gray-400">
                      {new Date(h.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {h.changedByName && ` • par ${h.changedByName}`}
                    </div>
                    {h.reason && <div className="text-gray-600 italic mt-0.5">{h.reason}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                Annuler le {workSingular.toLowerCase()}
              </h3>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Motif d’annulation *
                </label>
                <select
                  required
                  value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="customer_request">Demande du client</option>
                  <option value="unavailable">Indisponibilité artisan</option>
                  <option value="duplicate">Doublon</option>
                  <option value="quote_not_accepted">Devis non validé</option>
                  <option value="scheduling_issue">Problème de planning</option>
                  <option value="technical_impossibility">Impossibilité technique</option>
                  <option value="other">Autre motif</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notes explicatives
                </label>
                <textarea
                  rows={3}
                  value={cancellationNotes}
                  onChange={e => setCancellationNotes(e.target.value)}
                  placeholder="Détails complémentaires..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Confirmer l’annulation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Worker Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-600" />
                Assigner un collaborateur
              </h3>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignWorker} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Professionnel de l’entreprise *
                </label>
                <select
                  required
                  value={assignUserId}
                  onChange={e => setAssignUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {orgProfessionals.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Rôle sur le chantier
                </label>
                <select
                  value={assignRole}
                  onChange={e => setAssignRole(e.target.value as 'lead' | 'technician' | 'assistant' | 'observer')}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="technician">Technicien / Artisan</option>
                  <option value="lead">Responsable / Chef de chantier</option>
                  <option value="assistant">Assistant / Apprenti</option>
                  <option value="observer">Observateur</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  data-testid="submit-assign-worker-button"
                  disabled={isPending}
                  className="inline-flex items-center px-4 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Assigner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" />
                {editingReportId ? 'Modifier le compte-rendu' : 'Nouveau compte-rendu'}
              </h3>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Résumé synthétique *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Remplacement vanne générale effectué avec succès"
                  value={reportSummary}
                  onChange={e => setReportSummary(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Travaux réalisés
                </label>
                <textarea
                  rows={3}
                  placeholder="Détails des opérations techniques menées..."
                  value={reportWorkPerformed}
                  onChange={e => setReportWorkPerformed(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Problèmes constatés
                </label>
                <textarea
                  rows={2}
                  placeholder="Points de blocage, vétusté, imprévus..."
                  value={reportIssuesFound}
                  onChange={e => setReportIssuesFound(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Recommandations
                </label>
                <textarea
                  rows={2}
                  placeholder="Préconisations d'entretien futur, travaux à prévoir..."
                  value={reportRecommendations}
                  onChange={e => setReportRecommendations(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  data-testid="submit-report-button"
                  disabled={isPending}
                  className="inline-flex items-center px-4 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Enregistrer le brouillon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
