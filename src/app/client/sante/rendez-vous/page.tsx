'use server';

import Link from 'next/link';
import { requirePatientPortalAccess } from '@/lib/patient-portal/auth';
import { patientPortalService } from '@/lib/services/patient-portal.service';
import { Calendar, Clock, MapPin, ChevronLeft, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

export default async function PatientPortalAppointmentsPage() {
  const portalCtx = await requirePatientPortalAccess();
  const appointments = await patientPortalService.getPatientAppointmentsForPortal(
    portalCtx.organizationId,
    portalCtx.patientId,
  );

  const now = new Date();
  const upcoming = appointments.filter((a) => new Date(a.startsAt) >= now && a.status === 'scheduled');
  const past = appointments.filter((a) => new Date(a.startsAt) < now || a.status !== 'scheduled');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Programmé
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <XCircle className="w-3.5 h-3.5" /> Annulé
          </span>
        );
      case 'no_show':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <AlertCircle className="w-3.5 h-3.5" /> Non honoré
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/client/sante"
            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 mb-2"
          >
            <ChevronLeft className="w-4 h-4" /> Retour au suivi santé
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Mes Rendez-vous de Soins</h1>
          <p className="text-sm text-slate-500">
            Consultez le planning de vos consultations et séances passées ou à venir.
          </p>
        </div>
      </div>

      {/* Upcoming Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-teal-600" />
          Rendez-vous à venir ({upcoming.length})
        </h2>

        {upcoming.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Clock className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">Aucun rendez-vous futur planifié</p>
            <p className="text-xs text-slate-500 mt-1">Contactez votre cabinet pour programmer votre prochaine séance.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((apt) => (
              <div
                key={apt.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 hover:border-teal-400 transition-colors"
              >
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-slate-900 text-base">{apt.appointmentTypeName}</h3>
                  {getStatusBadge(apt.status)}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>
                      {new Intl.DateTimeFormat('fr-FR', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                        timeZone: apt.timezone || 'Europe/Paris',
                      }).format(new Date(apt.startsAt))}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>
                      {apt.locationName} {apt.roomName ? `• Salle ${apt.roomName}` : ''}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past / History Section */}
      <div className="space-y-4 pt-6">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-500" />
          Historique des rendez-vous ({past.length})
        </h2>

        {past.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-500">
            Aucun historique de consultation.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100">
              {past.map((apt) => (
                <div key={apt.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{apt.appointmentTypeName}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Intl.DateTimeFormat('fr-FR', {
                        dateStyle: 'long',
                        timeStyle: 'short',
                        timeZone: apt.timezone || 'Europe/Paris',
                      }).format(new Date(apt.startsAt))}
                      {' • '}
                      {apt.locationName}
                    </p>
                  </div>
                  {getStatusBadge(apt.status)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
