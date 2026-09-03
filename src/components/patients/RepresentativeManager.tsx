'use client';

import React, { useState, useTransition } from 'react';
import { 
  UserPlus, 
  Link as LinkIcon, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Star, 
  AlertTriangle, 
  Receipt, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  X,
  AlertCircle
} from 'lucide-react';
import { 
  PatientRepresentativeWithLinkDTO, 
  PatientRepresentativeDTO,
  PATIENT_RELATIONSHIP_CODES, 
  PatientRelationshipCode 
} from '@/lib/patients/types';
import { 
  createRepresentativeAndLinkAction, 
  linkExistingRepresentativeAction,
  updateRepresentativeAction,
  updateRepresentativeLinkAction,
  setRepresentativeLinkActiveAction
} from '@/app/actions/patient-registry.actions';

interface RepresentativeManagerProps {
  patientId: string;
  representatives: PatientRepresentativeWithLinkDTO[];
  allRepresentatives: PatientRepresentativeDTO[];
  onUpdate: () => void;
}

const RELATIONSHIP_LABELS: Record<PatientRelationshipCode, string> = {
  parent: 'Parent',
  legal_guardian: 'Tuteur / Représentant légal',
  spouse_partner: 'Conjoint / Partenaire',
  adult_child: 'Enfant majeur',
  sibling: 'Frère / Sœur',
  caregiver: 'Aidant / Auxiliaire de vie',
  other: 'Autre contact',
};

export default function RepresentativeManager({
  patientId,
  representatives,
  allRepresentatives,
  onUpdate,
}: RepresentativeManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [modalMode, setModalMode] = useState<'create' | 'link_existing' | 'edit_link' | 'edit_rep' | null>(null);
  const [selectedRep, setSelectedRep] = useState<PatientRepresentativeWithLinkDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states for new representative & link
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('France');

  // Link flags state
  const [relationship, setRelationship] = useState<PatientRelationshipCode>('parent');
  const [isLegalRepresentative, setIsLegalRepresentative] = useState(false);
  const [isPrimaryContact, setIsPrimaryContact] = useState(false);
  const [isEmergencyContact, setIsEmergencyContact] = useState(false);
  const [isBillingContact, setIsBillingContact] = useState(false);

  // Selected existing representative ID
  const [existingRepId, setExistingRepId] = useState('');

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('');
    setPostalCode('');
    setCountry('France');
    setRelationship('parent');
    setIsLegalRepresentative(false);
    setIsPrimaryContact(false);
    setIsEmergencyContact(false);
    setIsBillingContact(false);
    setExistingRepId('');
    setSelectedRep(null);
    setError(null);
    setModalMode(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
  };

  const openLinkExistingModal = () => {
    resetForm();
    if (availableRepresentatives.length > 0) {
      setExistingRepId(availableRepresentatives[0].id);
    }
    setModalMode('link_existing');
  };

  const openEditLinkModal = (rep: PatientRepresentativeWithLinkDTO) => {
    resetForm();
    setSelectedRep(rep);
    setRelationship(rep.relationship);
    setIsLegalRepresentative(rep.isLegalRepresentative);
    setIsPrimaryContact(rep.isPrimaryContact);
    setIsEmergencyContact(rep.isEmergencyContact);
    setIsBillingContact(rep.isBillingContact);
    setModalMode('edit_link');
  };

  const openEditRepModal = (rep: PatientRepresentativeWithLinkDTO) => {
    resetForm();
    setSelectedRep(rep);
    setFirstName(rep.firstName);
    setLastName(rep.lastName);
    setEmail(rep.email ?? '');
    setPhone(rep.phone ?? '');
    setAddress(rep.address ?? '');
    setCity(rep.city ?? '');
    setPostalCode(rep.postalCode ?? '');
    setCountry(rep.country ?? 'France');
    setModalMode('edit_rep');
  };

  // Filter out representatives already linked to this patient (active or inactive)
  const linkedRepIds = new Set(representatives.map((r) => r.representativeId));
  const availableRepresentatives = allRepresentatives.filter((r) => !linkedRepIds.has(r.id));

  const handleCreateAndLink = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await createRepresentativeAndLinkAction(
          patientId,
          {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            address: address.trim() || undefined,
            city: city.trim() || undefined,
            postalCode: postalCode.trim() || undefined,
            country: country.trim() || undefined,
          },
          {
            relationship,
            isLegalRepresentative,
            isPrimaryContact,
            isEmergencyContact,
            isBillingContact,
          }
        );
        resetForm();
        onUpdate();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la création du représentant');
      }
    });
  };

  const handleLinkExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingRepId) {
      setError('Veuillez sélectionner un représentant');
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        await linkExistingRepresentativeAction(patientId, existingRepId, {
          relationship,
          isLegalRepresentative,
          isPrimaryContact,
          isEmergencyContact,
          isBillingContact,
        });
        resetForm();
        onUpdate();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la liaison du représentant');
      }
    });
  };

  const handleUpdateLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRep) return;
    setError(null);

    startTransition(async () => {
      try {
        await updateRepresentativeLinkAction(
          selectedRep.linkId,
          {
            relationship,
            isLegalRepresentative,
            isPrimaryContact,
            isEmergencyContact,
            isBillingContact,
          },
          patientId
        );
        resetForm();
        onUpdate();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du lien');
      }
    });
  };

  const handleUpdateRep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRep) return;
    setError(null);

    startTransition(async () => {
      try {
        await updateRepresentativeAction(selectedRep.representativeId, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          country: country.trim() || undefined,
        });
        resetForm();
        onUpdate();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du représentant');
      }
    });
  };

  const handleToggleLinkActive = (rep: PatientRepresentativeWithLinkDTO) => {
    startTransition(async () => {
      try {
        await setRepresentativeLinkActiveAction(rep.linkId, !rep.isLinkActive, patientId);
        onUpdate();
      } catch (err) {
        console.error('Erreur lors du changement de statut du lien', err);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Représentants et contacts associés
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Parents, tuteurs légaux, aidants et contacts d'urgence
          </p>
        </div>
        <div className="flex items-center gap-2">
          {availableRepresentatives.length > 0 && (
            <button
              type="button"
              onClick={openLinkExistingModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-colors"
            >
              <LinkIcon className="w-3.5 h-3.5 text-gray-500" />
              Lier un contact existant
            </button>
          )}
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau contact
          </button>
        </div>
      </div>

      {representatives.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {representatives.map((rep) => (
            <div
              key={rep.linkId}
              className={`p-4 rounded-xl border transition-all ${
                rep.isLinkActive
                  ? 'bg-white border-gray-200 shadow-sm hover:border-blue-200'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {rep.firstName} {rep.lastName}
                  </h3>
                  <p className="text-xs font-medium text-blue-600 mt-0.5">
                    {RELATIONSHIP_LABELS[rep.relationship] || rep.relationship}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditRepModal(rep)}
                    title="Modifier les coordonnées"
                    className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditLinkModal(rep)}
                    title="Modifier la relation / rôles"
                    className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleLinkActive(rep)}
                    disabled={isPending}
                    title={rep.isLinkActive ? 'Archiver le lien' : 'Réactiver le lien'}
                    className={`p-1 rounded ${
                      rep.isLinkActive
                        ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {rep.isLinkActive ? (
                      <XCircle className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                {rep.isLegalRepresentative && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    <ShieldCheck className="w-3 h-3 text-purple-600" />
                    Représentant légal
                  </span>
                )}
                {rep.isPrimaryContact && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    Contact principal
                  </span>
                )}
                {rep.isEmergencyContact && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                    Urgence
                  </span>
                )}
                {rep.isBillingContact && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Receipt className="w-3 h-3 text-emerald-600" />
                    Facturation
                  </span>
                )}
                {!rep.isLinkActive && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    Lien archivé
                  </span>
                )}
              </div>

              {/* Coordonnées */}
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-xs text-gray-600">
                {rep.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{rep.phone}</span>
                  </div>
                )}
                {rep.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{rep.email}</span>
                  </div>
                )}
                {(rep.address || rep.city) && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      {[rep.address, rep.postalCode, rep.city].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {!rep.phone && !rep.email && !rep.address && (
                  <span className="text-gray-400 italic">Aucune coordonnée renseignée</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center">
          <UserPlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">Aucun représentant associé</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Ajoutez un représentant légal, un parent ou un contact d'urgence pour ce patient.
          </p>
        </div>
      )}

      {/* Modal: Create & Link New Representative */}
      {modalMode === 'create' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-semibold text-gray-900">
                Ajouter un représentant / contact
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                {error}
              </div>
            )}

            <form onSubmit={handleCreateAndLink} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rep-create-first-name" className="block text-xs font-medium text-gray-700 mb-1">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="rep-create-first-name"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ex: Sophie"
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="rep-create-last-name" className="block text-xs font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="rep-create-last-name"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ex: DUPONT"
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rep-create-email" className="block text-xs font-medium text-gray-700 mb-1">
                    E-mail
                  </label>
                  <input
                    id="rep-create-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@exemple.fr"
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="rep-create-phone" className="block text-xs font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    id="rep-create-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="06 12 34 56 78"
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="rep-create-relationship" className="block text-xs font-medium text-gray-700 mb-1">
                  Lien de parenté / Relation <span className="text-red-500">*</span>
                </label>
                <select
                  id="rep-create-relationship"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value as PatientRelationshipCode)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {PATIENT_RELATIONSHIP_CODES.map((code) => (
                    <option key={code} value={code}>
                      {RELATIONSHIP_LABELS[code]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Flags */}
              <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-1">Rôles et autorisations</p>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLegalRepresentative}
                    onChange={(e) => setIsLegalRepresentative(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Représentant légal (autorité parentale / tutelle)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimaryContact}
                    onChange={(e) => setIsPrimaryContact(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Contact principal à joindre</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEmergencyContact}
                    onChange={(e) => setIsEmergencyContact(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Contact en cas d'urgence</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBillingContact}
                    onChange={(e) => setIsBillingContact(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Destinataire des informations de facturation</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Enregistrement...' : 'Créer et associer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Link Existing Representative */}
      {modalMode === 'link_existing' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-semibold text-gray-900">
                Lier un représentant existant
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                {error}
              </div>
            )}

            <form onSubmit={handleLinkExisting} className="space-y-4">
              <div>
                <label htmlFor="rep-link-select" className="block text-xs font-medium text-gray-700 mb-1">
                  Sélectionner un contact existant <span className="text-red-500">*</span>
                </label>
                <select
                  id="rep-link-select"
                  value={existingRepId}
                  onChange={(e) => setExistingRepId(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {availableRepresentatives.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.lastName} {r.firstName} {r.phone ? `(${r.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="rep-link-relationship" className="block text-xs font-medium text-gray-700 mb-1">
                  Lien de parenté / Relation <span className="text-red-500">*</span>
                </label>
                <select
                  id="rep-link-relationship"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value as PatientRelationshipCode)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {PATIENT_RELATIONSHIP_CODES.map((code) => (
                    <option key={code} value={code}>
                      {RELATIONSHIP_LABELS[code]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Flags */}
              <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-1">Rôles pour ce patient</p>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLegalRepresentative}
                    onChange={(e) => setIsLegalRepresentative(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Représentant légal (autorité parentale / tutelle)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimaryContact}
                    onChange={(e) => setIsPrimaryContact(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Contact principal à joindre</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEmergencyContact}
                    onChange={(e) => setIsEmergencyContact(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Contact en cas d'urgence</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBillingContact}
                    onChange={(e) => setIsBillingContact(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Destinataire des informations de facturation</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Liaison...' : 'Associer au patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Link Metadata */}
      {modalMode === 'edit_link' && selectedRep && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-semibold text-gray-900">
                Modifier le rôle de {selectedRep.firstName} {selectedRep.lastName}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                {error}
              </div>
            )}

            <form onSubmit={handleUpdateLink} className="space-y-4">
              <div>
                <label htmlFor="rep-edit-relationship" className="block text-xs font-medium text-gray-700 mb-1">
                  Lien de parenté / Relation
                </label>
                <select
                  id="rep-edit-relationship"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value as PatientRelationshipCode)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {PATIENT_RELATIONSHIP_CODES.map((code) => (
                    <option key={code} value={code}>
                      {RELATIONSHIP_LABELS[code]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Flags */}
              <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-1">Rôles pour ce patient</p>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLegalRepresentative}
                    onChange={(e) => setIsLegalRepresentative(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Représentant légal (autorité parentale / tutelle)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimaryContact}
                    onChange={(e) => setIsPrimaryContact(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Contact principal à joindre</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEmergencyContact}
                    onChange={(e) => setIsEmergencyContact(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Contact en cas d'urgence</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBillingContact}
                    onChange={(e) => setIsBillingContact(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Destinataire des informations de facturation</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Mise à jour...' : 'Mettre à jour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Representative Coordinates */}
      {modalMode === 'edit_rep' && selectedRep && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-semibold text-gray-900">
                Modifier les coordonnées du contact
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                {error}
              </div>
            )}

            <form onSubmit={handleUpdateRep} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rep-edit-first-name" className="block text-xs font-medium text-gray-700 mb-1">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="rep-edit-first-name"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="rep-edit-last-name" className="block text-xs font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="rep-edit-last-name"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rep-edit-email" className="block text-xs font-medium text-gray-700 mb-1">
                    E-mail
                  </label>
                  <input
                    id="rep-edit-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="rep-edit-phone" className="block text-xs font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    id="rep-edit-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="rep-edit-address" className="block text-xs font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <input
                  id="rep-edit-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rep-edit-postal-code" className="block text-xs font-medium text-gray-700 mb-1">
                    Code postal
                  </label>
                  <input
                    id="rep-edit-postal-code"
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="rep-edit-city" className="block text-xs font-medium text-gray-700 mb-1">
                    Ville
                  </label>
                  <input
                    id="rep-edit-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Mise à jour...' : 'Mettre à jour les coordonnées'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
