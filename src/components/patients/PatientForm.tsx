'use client';

import { useCareVocabulary, useCareVocabularyMode } from '@/hooks/useCareVocabulary';
import { announceGuideSaved } from '@/components/onboarding/definitions/workflows';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Save, 
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { PatientProfileDTO, PATIENT_SEX_CODES, PatientSexCode } from '@/lib/patients/types';
import { createPatientAction, updatePatientAction } from '@/app/actions/patient-registry.actions';
import { createClinicalMeasurementAction } from '@/app/actions/clinical-record.actions';
import { computeBmi } from '@/lib/wellness/body-profile';

interface PatientFormProps {
  initialPatient?: PatientProfileDTO;
  onSuccess?: (patient: PatientProfileDTO) => void;
  onCancel?: () => void;
}

export default function PatientForm({ initialPatient, onSuccess, onCancel }: PatientFormProps) {
  const t = useCareVocabulary();
  // Bien-être (coach, nutritionniste, massage) : fiche client simple, sans identité
  // d'état civil ni sexe administratif ; taille et poids pour calculer l'IMC.
  const simple = useCareVocabularyMode() === 'client';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [birthName, setBirthName] = useState(initialPatient?.birthName ?? '');
  const [firstBirthName, setFirstBirthName] = useState(initialPatient?.firstBirthName ?? '');
  const [birthFirstNames, setBirthFirstNames] = useState(initialPatient?.birthFirstNames ?? '');
  const [usedName, setUsedName] = useState(initialPatient?.usedName ?? '');
  const [usedFirstName, setUsedFirstName] = useState(initialPatient?.usedFirstName ?? '');
  const [birthDate, setBirthDate] = useState(initialPatient?.birthDate ?? '');
  const [sex, setSex] = useState<PatientSexCode>(initialPatient?.sex ?? (simple ? 'unknown' : 'female'));
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const bmiPreview = computeBmi(Number.parseFloat(weightKg.replace(',', '.')), Number.parseFloat(heightCm.replace(',', '.')));
  const [birthPlace, setBirthPlace] = useState(initialPatient?.birthPlace ?? '');
  const [birthPlaceCode, setBirthPlaceCode] = useState(initialPatient?.birthPlaceCode ?? '');
  const [birthCountry, setBirthCountry] = useState(initialPatient?.birthCountry ?? 'France');
  const [email, setEmail] = useState(initialPatient?.email ?? '');
  const [phone, setPhone] = useState(initialPatient?.phone ?? '');
  const [address, setAddress] = useState(initialPatient?.address ?? '');
  const [city, setCity] = useState(initialPatient?.city ?? '');
  const [postalCode, setPostalCode] = useState(initialPatient?.postalCode ?? '');
  const [country, setCountry] = useState(initialPatient?.country ?? 'France');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      birthName: birthName.trim(),
      firstBirthName: firstBirthName.trim(),
      birthFirstNames: birthFirstNames.trim() || undefined,
      usedName: usedName.trim() || undefined,
      usedFirstName: usedFirstName.trim() || undefined,
      birthDate: birthDate.trim(),
      sex,
      birthPlace: birthPlace.trim() || undefined,
      birthPlaceCode: birthPlaceCode.trim() || undefined,
      birthCountry: birthCountry.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      country: country.trim() || undefined,
    };

    startTransition(async () => {
      try {
        if (initialPatient) {
          const updated = await updatePatientAction(initialPatient.id, payload);
          announceGuideSaved(t('Le dossier patient est enregistré.'));
          if (onSuccess) {
            onSuccess(updated);
          } else {
            router.push(`/patients/${initialPatient.id}`);
          }
        } else {
          const created = await createPatientAction(payload);
          if (simple) {
            // Mesures facultatives saisies à la création : elles alimentent l'IMC.
            const observedAt = new Date().toISOString();
            const height = Number.parseFloat(heightCm.replace(',', '.'));
            const weight = Number.parseFloat(weightKg.replace(',', '.'));
            try {
              if (height > 0) await createClinicalMeasurementAction(created.id, { code: 'height', label: 'Taille', valueNumeric: height, unit: 'cm', observedAt });
              if (weight > 0) await createClinicalMeasurementAction(created.id, { code: 'weight', label: 'Poids', valueNumeric: weight, unit: 'kg', observedAt });
            } catch {
              /* la fiche est créée ; les mesures restent ajoutables depuis le suivi */
            }
          }
          announceGuideSaved(t('Le dossier patient est enregistré.'));
          if (onSuccess) {
            onSuccess(created);
          } else {
            router.push(`/patients/${created.id}`);
          }
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Une erreur est survenue lors de l’enregistrement');
        }
      }
    });
  };

  return (
    <form data-guide-form="patient" onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
          <div>
            <p className="font-semibold">Erreur de validation</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Section 1: Identité civile de naissance */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
          <User className="w-5 h-5 text-blue-600" />
          {simple ? 'Identité' : 'Identité civile de naissance'}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="patient-birth-name" className="block text-xs font-medium text-gray-700 mb-1">
              {simple ? 'Nom' : 'Nom de naissance'} <span className="text-red-500">*</span>
            </label>
            <input
              id="patient-birth-name"
              type="text"
              required
              value={birthName}
              onChange={(e) => setBirthName(e.target.value)}
              placeholder="Ex: DUPONT"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="patient-first-birth-name" className="block text-xs font-medium text-gray-700 mb-1">
              {simple ? 'Prénom' : 'Premier prénom de naissance'} <span className="text-red-500">*</span>
            </label>
            <input
              id="patient-first-birth-name"
              type="text"
              required
              value={firstBirthName}
              onChange={(e) => setFirstBirthName(e.target.value)}
              placeholder="Ex: Jean"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {!simple && <div className="sm:col-span-2">
            <label htmlFor="patient-birth-first-names" className="block text-xs font-medium text-gray-700 mb-1">
              Tous les prénoms de naissance (optionnel)
            </label>
            <input
              id="patient-birth-first-names"
              type="text"
              value={birthFirstNames}
              onChange={(e) => setBirthFirstNames(e.target.value)}
              placeholder="Ex: Jean, Pierre, Marie"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>}

          <div>
            <label htmlFor="patient-birth-date" className="block text-xs font-medium text-gray-700 mb-1">
              Date de naissance <span className="text-red-500">*</span>
            </label>
            <input
              id="patient-birth-date"
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {!simple && <div>
            <label htmlFor="patient-sex" className="block text-xs font-medium text-gray-700 mb-1">
              Sexe administratif <span className="text-red-500">*</span>
            </label>
            <select
              id="patient-sex"
              value={sex}
              onChange={(e) => setSex(e.target.value as PatientSexCode)}
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="female">Féminin</option>
              <option value="male">Masculin</option>
              <option value="indeterminate">Indéterminé</option>
              <option value="unknown">Inconnu</option>
            </select>
          </div>}
        </div>
      </div>

      {simple && !initialPatient && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Profil corporel (facultatif)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="client-height" className="block text-xs font-medium text-gray-700 mb-1">Taille (cm)</label>
              <input id="client-height" type="number" inputMode="decimal" min="50" max="250" step="0.5" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="client-weight" className="block text-xs font-medium text-gray-700 mb-1">Poids (kg)</label>
              <input id="client-weight" type="number" inputMode="decimal" min="20" max="400" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div aria-live="polite">
              <span className="block text-xs font-medium text-gray-700 mb-1">IMC</span>
              <p className="text-sm text-gray-900 py-2">{bmiPreview ? `${bmiPreview.value.toLocaleString('fr-FR')} · ${bmiPreview.label}` : 'Calculé avec la taille et le poids'}</p>
            </div>
          </div>
        </div>
      )}

      {!simple && (<>
      {/* Section 2: Nom et prénom d'usage */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
          Nom et prénom d’usage (si différents)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="patient-used-name" className="block text-xs font-medium text-gray-700 mb-1">
              Nom d'usage (ex: nom marital)
            </label>
            <input
              id="patient-used-name"
              type="text"
              value={usedName}
              onChange={(e) => setUsedName(e.target.value)}
              placeholder="Ex: MARTIN"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="patient-used-first-name" className="block text-xs font-medium text-gray-700 mb-1">
              Prénom d'usage
            </label>
            <input
              id="patient-used-first-name"
              type="text"
              value={usedFirstName}
              onChange={(e) => setUsedFirstName(e.target.value)}
              placeholder="Ex: Jean-Luc"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Lieu de naissance */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
          Lieu de naissance
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="patient-birth-place" className="block text-xs font-medium text-gray-700 mb-1">
              Commune de naissance
            </label>
            <input
              id="patient-birth-place"
              type="text"
              value={birthPlace}
              onChange={(e) => setBirthPlace(e.target.value)}
              placeholder="Ex: Lyon"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="patient-birth-place-code" className="block text-xs font-medium text-gray-700 mb-1">
              Code INSEE commune
            </label>
            <input
              id="patient-birth-place-code"
              type="text"
              value={birthPlaceCode}
              onChange={(e) => setBirthPlaceCode(e.target.value)}
              placeholder="Ex: 69123"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="patient-birth-country" className="block text-xs font-medium text-gray-700 mb-1">
              Pays de naissance
            </label>
            <input
              id="patient-birth-country"
              type="text"
              value={birthCountry}
              onChange={(e) => setBirthCountry(e.target.value)}
              placeholder="Ex: France"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      </>)}

      {/* Section 4: Coordonnées & Adresse */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
          <MapPin className="w-5 h-5 text-blue-600" />
          Coordonnées de contact
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="patient-email" className="block text-xs font-medium text-gray-700 mb-1">
              Adresse e-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                id="patient-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@exemple.fr"
                className="w-full text-sm pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="patient-phone" className="block text-xs font-medium text-gray-700 mb-1">
              Numéro de téléphone
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                id="patient-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                className="w-full text-sm pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="patient-address" className="block text-xs font-medium text-gray-700 mb-1">
              Adresse postale
            </label>
            <input
              id="patient-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="12 rue de la République"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="patient-postal-code" className="block text-xs font-medium text-gray-700 mb-1">
              Code postal
            </label>
            <input
              id="patient-postal-code"
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="75001"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="patient-city" className="block text-xs font-medium text-gray-700 mb-1">
              Ville
            </label>
            <input
              id="patient-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Paris"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="patient-country" className="block text-xs font-medium text-gray-700 mb-1">
              Pays de résidence
            </label>
            <input
              id="patient-country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="France"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
        ) : (
          <Link
            href="/patients"
            className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
          </Link>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isPending ? 'Enregistrement...' : initialPatient ? 'Mettre à jour' : t('Créer le patient')}
        </button>
      </div>
    </form>
  );
}
