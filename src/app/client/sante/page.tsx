'use server';

import Link from 'next/link';
import { requirePatientPortalAccess } from '@/lib/patient-portal/auth';
import { patientPortalService } from '@/lib/services/patient-portal.service';
import {
  Calendar,
  FileText,
  ClipboardList,
  CreditCard,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export default async function PatientPortalDashboardPage() {
  const portalCtx = await requirePatientPortalAccess();
  const overview = await patientPortalService.getPatientPortalOverview(
    portalCtx.organizationId,
    portalCtx.patientId,
    portalCtx.userId,
  );

  const nextApt = overview.nextAppointment;

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-600/50 text-teal-100 text-xs font-semibold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-4 h-4" />
              Espace Patient Sécurisé
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Suivi de vos soins & consultations
            </h1>
            <p className="text-teal-100/90 mt-1 text-sm sm:text-base max-w-xl">
              Retrouvez l’ensemble de vos rendez-vous, questionnaires à remplir, documents partagés et factures de soin.
            </p>
          </div>
          {portalCtx.accessType === 'representative' && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 text-xs text-teal-100">
              <span className="font-semibold text-white block">Accès Représentant Légal</span>
              Dossier patient suivi : #{portalCtx.patientId.slice(0, 8)}
            </div>
          )}
        </div>
      </div>

      {/* Quick Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Link
          href="/client/sante/rendez-vous"
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-teal-50 text-teal-700 rounded-lg group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-slate-800">{overview.upcomingAppointmentsCount}</span>
          </div>
          <p className="text-slate-600 text-sm font-medium mt-3">Rendez-vous à venir</p>
          <p className="text-xs text-slate-400 mt-0.5">Calendrier des consultations</p>
        </Link>

        <Link
          href="/client/sante/questionnaires"
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-amber-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <ClipboardList className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-slate-800">{overview.pendingQuestionnairesCount}</span>
          </div>
          <p className="text-slate-600 text-sm font-medium mt-3">Questionnaires à remplir</p>
          <p className="text-xs text-slate-400 mt-0.5">Bilans & auto-évaluations</p>
        </Link>

        <Link
          href="/client/sante/documents"
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-teal-50 text-teal-700 rounded-lg group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-slate-800">{overview.sharedDocumentsCount}</span>
          </div>
          <p className="text-slate-600 text-sm font-medium mt-3">Documents partagés</p>
          <p className="text-xs text-slate-400 mt-0.5">Comptes-rendus & bilans</p>
        </Link>

        <Link
          href="/client/sante/messages"
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-slate-800">{overview.recentMessagesCount}</span>
          </div>
          <p className="text-slate-600 text-sm font-medium mt-3">Messages reçus</p>
          <p className="text-xs text-slate-400 mt-0.5">Échanges avec vos praticiens</p>
        </Link>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Appointment Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              Prochain rendez-vous
            </h2>
            <Link
              href="/client/sante/rendez-vous"
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
            >
              Tous mes RDV <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {nextApt ? (
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-teal-100 text-teal-800 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirmé
                </div>
                <h3 className="text-base font-bold text-slate-900 pt-1">
                  {nextApt.appointmentTypeName}
                </h3>
                <p className="text-sm text-slate-600">
                  {new Intl.DateTimeFormat('fr-FR', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                    timeZone: nextApt.timezone || 'Europe/Paris',
                  }).format(new Date(nextApt.startsAt))}
                </p>
                <p className="text-xs text-slate-500">
                  Lieu : {nextApt.locationName} {nextApt.roomName ? `(${nextApt.roomName})` : ''}
                </p>
              </div>
              <Link
                href="/client/sante/rendez-vous"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                Voir les détails
              </Link>
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">Aucun rendez-vous à venir</p>
              <p className="text-xs text-slate-500 mt-1">Vos prochaines consultations programmées s'afficheront ici.</p>
            </div>
          )}
        </div>

        {/* Quick Actions / Useful Links */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Accès rapides</h2>
          <div className="space-y-2">
            <Link
              href="/client/sante/questionnaires"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ClipboardList className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Remplir un questionnaire</p>
                  <p className="text-[11px] text-slate-500">Préparez votre consultation</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              href="/client/sante/factures"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-teal-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Factures de soins</p>
                  <p className="text-[11px] text-slate-500">Règlement et attestations</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              href="/client/sante/messages"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Messagerie praticien</p>
                  <p className="text-[11px] text-slate-500">Poser une question à votre cabinet</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
