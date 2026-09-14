'use client';

import { useState } from 'react';
import {
  savePatientQuestionnaireDraftAction,
  submitPatientQuestionnaireAction,
} from '@/app/actions/patient-portal.actions';
import type { PatientQuestionnaireAssignmentDTO } from '@/lib/patient-portal/types';
import type {
  ClinicalFormFieldDefinition,
  ClinicalFormFieldOption,
  ClinicalFormAnswers,
} from '@/lib/clinical/types';
import { CheckCircle2, Save, Send, Loader2, AlertCircle } from 'lucide-react';

export default function QuestionnaireRunner({
  assignment,
  onCompleted,
}: {
  assignment: PatientQuestionnaireAssignmentDTO;
  onCompleted?: () => void;
}) {
  const [answers, setAnswers] = useState<ClinicalFormAnswers>(assignment.answers || {});
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isSubmitted = assignment.status === 'submitted';

  const fields: ClinicalFormFieldDefinition[] = assignment.templateSchema?.fields || [];

  const handleValueChange = (fieldId: string, val: unknown) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({
      ...prev,
      [fieldId]: val as string | number | boolean | string[],
    }));
  };

  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true);
      setError(null);
      await savePatientQuestionnaireDraftAction({
        assignmentId: assignment.id,
        answers,
      });
      setSuccessMessage('Brouillon enregistré avec succès.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde du brouillon';
      setError(msg);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await submitPatientQuestionnaireAction({
        assignmentId: assignment.id,
        answers,
      });
      setSuccessMessage('Questionnaire transmis avec succès à votre praticien !');
      if (onCompleted) onCompleted();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la soumission du questionnaire';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {successMessage && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-5">
        {fields.map((field) => {
          const val = answers[field.id];

          return (
            <div key={field.id} className="space-y-1.5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
              <label className="block text-sm font-semibold text-slate-900">
                {field.label}
                {field.required && <span className="text-rose-500 ml-1">*</span>}
              </label>

              {field.type === 'text' && (
                <input
                  type="text"
                  disabled={isSubmitted}
                  value={(val as string) || ''}
                  onChange={(e) => handleValueChange(field.id, e.target.value)}
                  placeholder="Votre réponse..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-slate-100"
                />
              )}

              {field.type === 'number' && (
                <input
                  type="number"
                  disabled={isSubmitted}
                  min={field.min}
                  max={field.max}
                  value={val !== undefined ? String(val) : ''}
                  onChange={(e) => handleValueChange(field.id, e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-slate-100"
                />
              )}

              {field.type === 'single_choice' && (
                <select
                  disabled={isSubmitted}
                  value={(val as string) || ''}
                  onChange={(e) => handleValueChange(field.id, e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-slate-100"
                >
                  <option value="">Sélectionnez une option...</option>
                  {field.options?.map((opt: ClinicalFormFieldOption) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {field.type === 'boolean' && (
                <div className="flex items-center gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name={field.id}
                      disabled={isSubmitted}
                      checked={val === true}
                      onChange={() => handleValueChange(field.id, true)}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    Oui
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name={field.id}
                      disabled={isSubmitted}
                      checked={val === false}
                      onChange={() => handleValueChange(field.id, false)}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    Non
                  </label>
                </div>
              )}

              {field.type === 'date' && (
                <input
                  type="date"
                  disabled={isSubmitted}
                  value={(val as string) || ''}
                  onChange={(e) => handleValueChange(field.id, e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-slate-100"
                />
              )}
            </div>
          );
        })}
      </div>

      {!isSubmitted && (
        <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-slate-500" />}
            Enregistrer le brouillon
          </button>

          <button
            type="submit"
            disabled={savingDraft || submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 shadow-sm transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Transmettre au praticien
          </button>
        </div>
      )}
    </form>
  );
}
