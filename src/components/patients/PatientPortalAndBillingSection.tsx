'use client';

import React, { useState, useEffect } from 'react';
import {
  grantPatientPortalAccessAction,
  revokePatientPortalAccessAction,
  listPatientPortalAccessAction,
  assignQuestionnaireToPatientAction,
  listPatientQuestionnairesAction,
} from '@/app/actions/patient-portal.actions';
import {
  createPatientInvoiceAction,
  listPatientInvoicesAction,
} from '@/app/actions/patient-billing.actions';
import {
  listClinicalFormTemplatesAction,
} from '@/app/actions/clinical-record.actions';
import type {
  PatientPortalAccessDTO,
  PatientQuestionnaireAssignmentDTO,
} from '@/lib/patient-portal/types';
import type { PatientInvoiceDTO } from '@/lib/patient-billing/types';
import type { PatientDetailDTO } from '@/lib/patients/types';
import type { ClinicalFormTemplateDTO } from '@/lib/clinical/types';
import {
  ShieldCheck,
  KeyRound,
  FileCheck,
  CreditCard,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Send,
} from 'lucide-react';

export default function PatientPortalAndBillingSection({
  patientDetail,
}: {
  patientDetail: PatientDetailDTO;
}) {
  const { patient, representatives } = patientDetail;
  const [activeTab, setActiveTab] = useState<'portal' | 'questionnaires' | 'billing'>('portal');

  // Portal Access state
  const [accessList, setAccessList] = useState<PatientPortalAccessDTO[]>([]);
  const [portalEmail, setPortalEmail] = useState(patient.email || '');
  const [selectedRepId, setSelectedRepId] = useState<string>('');
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  // Questionnaire assignment state
  const [assignments, setAssignments] = useState<PatientQuestionnaireAssignmentDTO[]>([]);
  const [templates, setTemplates] = useState<ClinicalFormTemplateDTO[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loadingQuestionnaires, setLoadingQuestionnaires] = useState(false);
  const [questionnaireError, setQuestionnaireError] = useState<string | null>(null);

  // Billing state
  const [invoices, setInvoices] = useState<PatientInvoiceDTO[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [invoiceDescription, setInvoiceDescription] = useState('Consultation & Séance de soins');
  const [invoiceAmount, setInvoiceAmount] = useState('50');
  const [invoiceVat, setInvoiceVat] = useState('0');
  const [invoiceDueDate, setInvoiceDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [billingError, setBillingError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    async function loadAll() {
      try {
        const [accessData, questionnaireData, invoiceData, templateData] = await Promise.all([
          listPatientPortalAccessAction(patient.id).catch(() => []),
          listPatientQuestionnairesAction(patient.id).catch(() => []),
          listPatientInvoicesAction(patient.id).catch(() => []),
          listClinicalFormTemplatesAction().catch(() => []),
        ]);
        setAccessList(accessData);
        setAssignments(questionnaireData);
        setInvoices(invoiceData);
        setTemplates(templateData);
      } catch (e) {
        console.error('Error loading portal/billing data', e);
      }
    }
    loadAll();
  }, [patient.id]);

  // Grant access
  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalEmail.trim()) return;
    try {
      setLoadingPortal(true);
      setPortalError(null);
      const newAccess = await grantPatientPortalAccessAction(patient.id, {
        email: portalEmail.trim(),
        representativeId: selectedRepId || undefined,
      });
      setAccessList((prev) => [newAccess, ...prev.filter((a) => a.id !== newAccess.id)]);
    } catch (err: unknown) {
      setPortalError(err instanceof Error ? err.message : 'Erreur lors de l’octroi d’accès');
    } finally {
      setLoadingPortal(false);
    }
  };

  // Revoke access
  const handleRevokeAccess = async (accessId: string) => {
    try {
      setLoadingPortal(true);
      setPortalError(null);
      const revoked = await revokePatientPortalAccessAction(patient.id, { accessId });
      setAccessList((prev) => prev.map((a) => (a.id === accessId ? revoked : a)));
    } catch (err: unknown) {
      setPortalError(err instanceof Error ? err.message : 'Erreur lors de la révocation');
    } finally {
      setLoadingPortal(false);
    }
  };

  // Assign questionnaire
  const handleAssignQuestionnaire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) return;
    try {
      setLoadingQuestionnaires(true);
      setQuestionnaireError(null);
      const newAssignment = await assignQuestionnaireToPatientAction(patient.id, {
        templateId: selectedTemplateId,
      });
      setAssignments((prev) => [newAssignment, ...prev]);
      setSelectedTemplateId('');
    } catch (err: unknown) {
      setQuestionnaireError(err instanceof Error ? err.message : 'Erreur lors de l’assignation');
    } finally {
      setLoadingQuestionnaires(false);
    }
  };

  // Create invoice
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(invoiceAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      setLoadingBilling(true);
      setBillingError(null);
      const newInv = await createPatientInvoiceAction(patient.id, {
        patientId: patient.id,
        dueDate: invoiceDueDate,
        lines: [
          {
            description: invoiceDescription,
            quantity: 1,
            unitPrice: amount,
            vatRate: parseFloat(invoiceVat) || 0,
          },
        ],
      });
      setInvoices((prev) => [newInv, ...prev]);
    } catch (err: unknown) {
      setBillingError(err instanceof Error ? err.message : 'Erreur lors de la création de la facture');
    } finally {
      setLoadingBilling(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mt-6">
      {/* Tab Header */}
      <div className="flex border-b border-slate-200 bg-slate-50/70 p-1">
        <button
          onClick={() => setActiveTab('portal')}
          className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'portal'
              ? 'bg-white text-teal-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <KeyRound className="w-4 h-4 text-teal-600" />
          Portail & Accès Patient ({accessList.filter((a) => a.isActive).length})
        </button>

        <button
          onClick={() => setActiveTab('questionnaires')}
          className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'questionnaires'
              ? 'bg-white text-amber-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4 text-amber-600" />
          Questionnaires assignés ({assignments.length})
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'billing'
              ? 'bg-white text-teal-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4 text-teal-600" />
          Factures & Règlements ({invoices.length})
        </button>
      </div>

      <div className="p-6">
        {/* ========================================== */}
        {/* TAB 1: PORTAL ACCESS */}
        {/* ========================================== */}
        {activeTab === 'portal' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Accès Portail Santé Patient</h3>
                <p className="text-xs text-slate-500">
                  Activez l'accès sécurisé pour le patient ou un représentant légal afin qu'il puisse consulter ses RDV, documents et remplir des questionnaires.
                </p>
              </div>
            </div>

            {portalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{portalError}</span>
              </div>
            )}

            {/* Grant Access Form */}
            <form onSubmit={handleGrantAccess} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Activer un nouvel accès</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Type d'accès</label>
                  <select
                    value={selectedRepId}
                    onChange={(e) => {
                      const repId = e.target.value;
                      setSelectedRepId(repId);
                      if (repId) {
                        const rep = representatives.find((r) => r.representativeId === repId);
                        if (rep?.email) setPortalEmail(rep.email);
                      } else {
                        setPortalEmail(patient.email || '');
                      }
                    }}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">Patient direct</option>
                    {representatives.map((r) => (
                      <option key={r.representativeId} value={r.representativeId}>
                        Représentant : {r.firstName} {r.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email du compte client</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      value={portalEmail}
                      onChange={(e) => setPortalEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300"
                    />
                    <button
                      type="submit"
                      disabled={loadingPortal || !portalEmail}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      {loadingPortal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Autoriser
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Existing Access List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Accès configurés</h4>
              {accessList.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucun accès portail configuré pour ce patient.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {accessList.map((acc) => (
                    <div key={acc.id} className="p-3.5 flex justify-between items-center bg-white">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            {acc.accessType === 'representative' ? 'Représentant légal' : 'Patient direct'}
                          </span>
                          {acc.isActive ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Actif
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Révoqué
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Créé le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(acc.createdAt))}
                        </p>
                      </div>

                      {acc.isActive && (
                        <button
                          onClick={() => handleRevokeAccess(acc.id)}
                          disabled={loadingPortal}
                          className="px-3 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-lg transition-colors"
                        >
                          Révoquer
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: QUESTIONNAIRES */}
        {/* ========================================== */}
        {activeTab === 'questionnaires' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Questionnaires & Auto-évaluations</h3>
                <p className="text-xs text-slate-500">
                  Assignez des formulaires au patient pour qu'il les remplisse depuis son espace sécurisé.
                </p>
              </div>
            </div>

            {questionnaireError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{questionnaireError}</span>
              </div>
            )}

            {/* Assign Form */}
            <form onSubmit={handleAssignQuestionnaire} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-slate-600 mb-1">Sélectionner un modèle de formulaire</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">Choisir un modèle...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.kind})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loadingQuestionnaires || !selectedTemplateId}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                {loadingQuestionnaires ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Assigner au patient
              </button>
            </form>

            {/* Assignment List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Questionnaires attribués</h4>
              {assignments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucun questionnaire assigné pour le moment.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {assignments.map((asg) => (
                    <div key={asg.id} className="p-3.5 flex justify-between items-center bg-white">
                      <div>
                        <h5 className="text-xs font-bold text-slate-800">{asg.templateName || 'Formulaire'}</h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Assigné le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(asg.createdAt))}
                          {asg.submittedAt && ` • Répondu le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(asg.submittedAt))}`}
                        </p>
                      </div>

                      <div>
                        {asg.status === 'submitted' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Transmis
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> En attente de réponse
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: BILLING & INVOICES */}
        {/* ========================================== */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Facturation & Notes d'Honoraires</h3>
                <p className="text-xs text-slate-500">
                  Générez des factures de soins pour le patient ou son représentant légal.
                </p>
              </div>
            </div>

            {billingError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{billingError}</span>
              </div>
            )}

            {/* Quick Invoice Creation Form */}
            <form onSubmit={handleCreateInvoice} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Créer une facture rapide</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Prestation</label>
                  <input
                    type="text"
                    required
                    value={invoiceDescription}
                    onChange={(e) => setInvoiceDescription(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Montant TTC (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Date d'échéance</label>
                  <input
                    type="date"
                    required
                    value={invoiceDueDate}
                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loadingBilling || !invoiceAmount}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {loadingBilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Émettre la facture
                </button>
              </div>
            </form>

            {/* Invoices List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Historique des factures</h4>
              {invoices.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucune facture enregistrée pour ce patient.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="p-3.5 flex justify-between items-center bg-white">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-slate-800">Facture {inv.invoiceNumber}</h5>
                          <span className="text-xs font-bold text-slate-900">
                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(inv.totalTTC)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Émise le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(inv.issueDate))}
                          {inv.dueDate && ` • Échéance : ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(inv.dueDate))}`}
                        </p>
                      </div>

                      <div>
                        {inv.status === 'paid' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Payée
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> En attente
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
