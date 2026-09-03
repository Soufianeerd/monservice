'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Edit, 
  UserCheck, 
  UserX, 
  ArrowLeft,
  Shield,
  Building,
  AlertCircle
} from 'lucide-react';
import { 
  PatientDetailDTO, 
  PatientRepresentativeDTO, 
  PatientProfileDTO 
} from '@/lib/patients/types';
import { setPatientActiveAction } from '@/app/actions/patient-registry.actions';
import PatientForm from './PatientForm';
import RepresentativeManager from './RepresentativeManager';

interface PatientDetailManagerProps {
  initialDetail: PatientDetailDTO;
  allRepresentatives: PatientRepresentativeDTO[];
}

export default function PatientDetailManager({
  initialDetail,
  allRepresentatives,
}: PatientDetailManagerProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<PatientDetailDTO>(initialDetail);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const { patient, representatives } = detail;

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const displayName = patient.usedName || patient.birthName;
  const displayFirstName = patient.usedFirstName || patient.firstBirthName;
  const hasUsageName = Boolean(patient.usedName && patient.usedName !== patient.birthName);
  const hasUsageFirstName = Boolean(patient.usedFirstName && patient.usedFirstName !== patient.firstBirthName);

  const handleTogglePatientActive = () => {
    setActionError(null);
    startTransition(async () => {
      try {
        const updated = await setPatientActiveAction(patient.id, !patient.isActive);
        setDetail((prev) => ({ ...prev, patient: updated }));
        router.refresh();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Erreur lors de la modification du statut');
      }
    });
  };

  const handlePatientUpdated = (updated: PatientProfileDTO) => {
    setDetail((prev) => ({ ...prev, patient: updated }));
    setIsEditing(false);
    router.refresh();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top breadcrumb & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/patients"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Retour au registre"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {displayName} {displayFirstName}
              </h1>
              {patient.isActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  <UserCheck className="w-3 h-3" />
                  Actif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  <UserX className="w-3 h-3" />
                  Archivé
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Dossier administratif patient #{patient.id.slice(0, 8)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                Modifier l’identité
              </button>
              <button
                type="button"
                onClick={handleTogglePatientActive}
                disabled={isPending}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg shadow-sm transition-colors ${
                  patient.isActive
                    ? 'text-red-700 bg-red-50 hover:bg-red-100 border border-red-200'
                    : 'text-green-700 bg-green-50 hover:bg-green-100 border border-green-200'
                }`}
              >
                {patient.isActive ? (
                  <>
                    <UserX className="w-3.5 h-3.5" />
                    Archiver le dossier
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    Réactiver le dossier
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
          {actionError}
        </div>
      )}

      {isEditing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Modification de l'identité administrative
            </h2>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Annuler
            </button>
          </div>
          <PatientForm
            initialPatient={patient}
            onSuccess={handlePatientUpdated}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main info card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Identité civile */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <User className="w-5 h-5 text-blue-600" />
                Identité civile
              </h2>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div>
                  <dt className="font-medium text-gray-500">Nom de naissance</dt>
                  <dd className="text-gray-900 font-semibold mt-0.5">{patient.birthName}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Premier prénom</dt>
                  <dd className="text-gray-900 font-semibold mt-0.5">{patient.firstBirthName}</dd>
                </div>

                {hasUsageName && (
                  <div>
                    <dt className="font-medium text-gray-500">Nom d'usage</dt>
                    <dd className="text-gray-900 font-semibold mt-0.5">{patient.usedName}</dd>
                  </div>
                )}
                {hasUsageFirstName && (
                  <div>
                    <dt className="font-medium text-gray-500">Prénom d'usage</dt>
                    <dd className="text-gray-900 font-semibold mt-0.5">{patient.usedFirstName}</dd>
                  </div>
                )}

                {patient.birthFirstNames && (
                  <div className="sm:col-span-2">
                    <dt className="font-medium text-gray-500">Tous les prénoms de naissance</dt>
                    <dd className="text-gray-900 mt-0.5">{patient.birthFirstNames}</dd>
                  </div>
                )}

                <div>
                  <dt className="font-medium text-gray-500">Date de naissance</dt>
                  <dd className="text-gray-900 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {formatDate(patient.birthDate)}
                  </dd>
                </div>

                <div>
                  <dt className="font-medium text-gray-500">Sexe administratif</dt>
                  <dd className="text-gray-900 mt-0.5 capitalize">
                    {patient.sex === 'female' && 'Féminin'}
                    {patient.sex === 'male' && 'Masculin'}
                    {patient.sex === 'indeterminate' && 'Indéterminé'}
                    {patient.sex === 'unknown' && 'Inconnu'}
                  </dd>
                </div>

                {(patient.birthPlace || patient.birthPlaceCode || patient.birthCountry) && (
                  <div className="sm:col-span-2 pt-2 border-t border-gray-100">
                    <dt className="font-medium text-gray-500">Lieu de naissance</dt>
                    <dd className="text-gray-900 mt-0.5">
                      {[
                        patient.birthPlace,
                        patient.birthPlaceCode ? `(${patient.birthPlaceCode})` : null,
                        patient.birthCountry,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Right: Coordonnées de contact */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                Coordonnées
              </h2>

              <dl className="space-y-3 text-xs">
                <div>
                  <dt className="font-medium text-gray-500">Téléphone</dt>
                  <dd className="text-gray-900 mt-0.5 flex items-center gap-1.5">
                    {patient.phone ? (
                      <>
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-medium">{patient.phone}</span>
                      </>
                    ) : (
                      <span className="text-gray-400 italic">Non renseigné</span>
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="font-medium text-gray-500">Adresse e-mail</dt>
                  <dd className="text-gray-900 mt-0.5 flex items-center gap-1.5">
                    {patient.email ? (
                      <>
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span>{patient.email}</span>
                      </>
                    ) : (
                      <span className="text-gray-400 italic">Non renseigné</span>
                    )}
                  </dd>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <dt className="font-medium text-gray-500">Adresse postale</dt>
                  <dd className="text-gray-900 mt-0.5">
                    {patient.address || patient.city ? (
                      <div>
                        {patient.address && <p>{patient.address}</p>}
                        <p>{[patient.postalCode, patient.city].filter(Boolean).join(' ')}</p>
                        {patient.country && <p className="text-gray-500">{patient.country}</p>}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Non renseignée</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Representatives and contacts section */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <RepresentativeManager
              patientId={patient.id}
              representatives={representatives}
              allRepresentatives={allRepresentatives}
              onUpdate={() => router.refresh()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
