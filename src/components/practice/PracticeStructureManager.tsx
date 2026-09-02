'use client';

import React, { useState, useTransition } from 'react';
import type { 
  PracticeStructureOverview, 
  PracticeLocationDTO, 
  PracticePractitionerDTO, 
  PracticeRoomDTO, 
  PracticeResourceDTO 
} from '@/lib/practice-structure/types';
import { 
  PARAMEDICAL_PROFESSION_CODES, 
  PARAMEDICAL_PROFESSIONS, 
  getParamedicalProfession,
  ParamedicalProfessionCode 
} from '@/lib/workspaces/paramedical/professions';
import {
  createPracticeLocationAction,
  updatePracticeLocationAction,
  setPrimaryPracticeLocationAction,
  setPracticeLocationActiveAction,
  createPracticePractitionerAction,
  updatePracticePractitionerAction,
  setPracticePractitionerActiveAction,
  setPractitionerLocationsAction,
  createPracticeRoomAction,
  updatePracticeRoomAction,
  setPracticeRoomActiveAction,
  createPracticeResourceAction,
  updatePracticeResourceAction,
  setPracticeResourceActiveAction,
} from '@/app/actions/practice-structure.actions';

const PRACTICE_TABS = [
  { id: 'locations', label: 'Lieux de consultation' },
  { id: 'practitioners', label: 'Praticiens' },
  { id: 'rooms', label: 'Salles' },
  { id: 'resources', label: 'Ressources' },
] as const;

type PracticeTabId = typeof PRACTICE_TABS[number]['id'];

interface PracticeStructureManagerProps {
  overview: PracticeStructureOverview;
}

export function PracticeStructureManager({ overview }: PracticeStructureManagerProps) {
  const [activeTab, setActiveTab] = useState<PracticeTabId>('locations');
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal / Form States
  const [editingLocation, setEditingLocation] = useState<PracticeLocationDTO | null>(null);
  const [isAddingLocation, setIsAddingLocation] = useState(false);

  const [editingPractitioner, setEditingPractitioner] = useState<PracticePractitionerDTO | null>(null);
  const [isAddingPractitioner, setIsAddingPractitioner] = useState(false);
  const [managingAssignmentsPractitioner, setManagingAssignmentsPractitioner] = useState<PracticePractitionerDTO | null>(null);

  const [editingRoom, setEditingRoom] = useState<PracticeRoomDTO | null>(null);
  const [isAddingRoom, setIsAddingRoom] = useState(false);

  const [editingResource, setEditingResource] = useState<PracticeResourceDTO | null>(null);
  const [isAddingResource, setIsAddingResource] = useState(false);

  // Form Fields
  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    timezone: 'Europe/Paris',
    phone: '',
  });

  const [practitionerForm, setPractitionerForm] = useState<{
    displayName: string;
    profession: ParamedicalProfessionCode;
    email: string;
    phone: string;
    userId: string;
  }>({
    displayName: '',
    profession: 'physiotherapist',
    email: '',
    phone: '',
    userId: '',
  });

  const [assignmentsForm, setAssignmentsForm] = useState<{
    selectedLocations: string[];
    primaryLocation: string;
  }>({
    selectedLocations: [],
    primaryLocation: '',
  });

  const [roomForm, setRoomForm] = useState({
    locationId: '',
    name: '',
    description: '',
  });

  const [resourceForm, setResourceForm] = useState({
    locationId: '',
    roomId: '',
    name: '',
    description: '',
  });

  const activeLocations = overview.locations.filter(l => l.isActive);

  // --- Handlers: Locations ---
  const handleOpenAddLocation = () => {
    setLocationForm({
      name: '',
      address: '',
      city: '',
      postalCode: '',
      country: '',
      timezone: 'Europe/Paris',
      phone: '',
    });
    setErrorMessage(null);
    setIsAddingLocation(true);
    setEditingLocation(null);
  };

  const handleOpenEditLocation = (loc: PracticeLocationDTO) => {
    setLocationForm({
      name: loc.name,
      address: loc.address ?? '',
      city: loc.city ?? '',
      postalCode: loc.postalCode ?? '',
      country: loc.country ?? '',
      timezone: loc.timezone,
      phone: loc.phone ?? '',
    });
    setErrorMessage(null);
    setEditingLocation(loc);
    setIsAddingLocation(false);
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    startTransition(async () => {
      try {
        if (editingLocation) {
          await updatePracticeLocationAction(editingLocation.id, locationForm);
          setEditingLocation(null);
        } else {
          await createPracticeLocationAction(locationForm);
          setIsAddingLocation(false);
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde du lieu');
      }
    });
  };

  const handleToggleLocationActive = (loc: PracticeLocationDTO) => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await setPracticeLocationActiveAction(loc.id, !loc.isActive);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Erreur modification statut');
      }
    });
  };

  const handleSetPrimaryLocation = (loc: PracticeLocationDTO) => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await setPrimaryPracticeLocationAction(loc.id);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Erreur définition lieu principal');
      }
    });
  };

  // --- Handlers: Practitioners ---
  const handleOpenAddPractitioner = () => {
    setPractitionerForm({
      displayName: '',
      profession: 'physiotherapist',
      email: '',
      phone: '',
      userId: '',
    });
    setErrorMessage(null);
    setIsAddingPractitioner(true);
    setEditingPractitioner(null);
  };

  const handleOpenEditPractitioner = (prac: PracticePractitionerDTO) => {
    const profCode = (PARAMEDICAL_PROFESSION_CODES.includes(prac.profession as ParamedicalProfessionCode)
      ? prac.profession
      : 'physiotherapist') as ParamedicalProfessionCode;

    setPractitionerForm({
      displayName: prac.displayName,
      profession: profCode,
      email: prac.email ?? '',
      phone: prac.phone ?? '',
      userId: prac.userId ?? '',
    });
    setErrorMessage(null);
    setEditingPractitioner(prac);
    setIsAddingPractitioner(false);
  };

  const handleSavePractitioner = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const payload = {
          displayName: practitionerForm.displayName,
          profession: practitionerForm.profession,
          email: practitionerForm.email || null,
          phone: practitionerForm.phone || null,
          userId: practitionerForm.userId || null,
        };
        if (editingPractitioner) {
          await updatePracticePractitionerAction(editingPractitioner.id, payload);
          setEditingPractitioner(null);
        } else {
          await createPracticePractitionerAction(payload);
          setIsAddingPractitioner(false);
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Erreur sauvegarde praticien');
      }
    });
  };

  const handleTogglePractitionerActive = (prac: PracticePractitionerDTO) => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await setPracticePractitionerActiveAction(prac.id, !prac.isActive);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Erreur modification statut');
      }
    });
  };

  const handleOpenAssignments = (prac: PracticePractitionerDTO) => {
    const currentAssignments = overview.assignments.filter(a => a.practitionerId === prac.id && a.isActive);
    const selected = currentAssignments.map(a => a.locationId);
    const primary = currentAssignments.find(a => a.isPrimary)?.locationId ?? (selected[0] ?? '');
    setAssignmentsForm({
      selectedLocations: selected,
      primaryLocation: primary,
    });
    setManagingAssignmentsPractitioner(prac);
    setErrorMessage(null);
  };

  const handleSaveAssignments = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingAssignmentsPractitioner) return;
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const payload = assignmentsForm.selectedLocations.map(locId => ({
          locationId: locId,
          isPrimary: locId === assignmentsForm.primaryLocation,
        }));
        await setPractitionerLocationsAction(managingAssignmentsPractitioner.id, payload);
        setManagingAssignmentsPractitioner(null);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Erreur sauvegarde affectations');
      }
    });
  };

  // --- Handlers: Rooms ---
  const handleOpenAddRoom = () => {
    setRoomForm({
      locationId: activeLocations[0]?.id ?? '',
      name: '',
      description: '',
    });
    setErrorMessage(null);
    setIsAddingRoom(true);
    setEditingRoom(null);
  };

  const handleOpenEditRoom = (room: PracticeRoomDTO) => {
    setRoomForm({
      locationId: room.locationId,
      name: room.name,
      description: room.description ?? '',
    });
    setErrorMessage(null);
    setEditingRoom(room);
    setIsAddingRoom(false);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    startTransition(async () => {
      try {
        if (editingRoom) {
          await updatePracticeRoomAction(editingRoom.id, {
            name: roomForm.name,
            description: roomForm.description || null,
          });
          setEditingRoom(null);
        } else {
          await createPracticeRoomAction({
            locationId: roomForm.locationId,
            name: roomForm.name,
            description: roomForm.description || null,
          });
          setIsAddingRoom(false);
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Erreur sauvegarde salle');
      }
    });
  };

  const handleToggleRoomActive = (room: PracticeRoomDTO) => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await setPracticeRoomActiveAction(room.id, !room.isActive);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Erreur statut salle');
      }
    });
  };

  // --- Handlers: Resources ---
  const handleOpenAddResource = () => {
    setResourceForm({
      locationId: activeLocations[0]?.id ?? '',
      roomId: '',
      name: '',
      description: '',
    });
    setErrorMessage(null);
    setIsAddingResource(true);
    setEditingResource(null);
  };

  const handleOpenEditResource = (res: PracticeResourceDTO) => {
    setResourceForm({
      locationId: res.locationId,
      roomId: res.roomId ?? '',
      name: res.name,
      description: res.description ?? '',
    });
    setErrorMessage(null);
    setEditingResource(res);
    setIsAddingResource(false);
  };

  const handleSaveResource = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    startTransition(async () => {
      try {
        if (editingResource) {
          await updatePracticeResourceAction(editingResource.id, {
            name: resourceForm.name,
            description: resourceForm.description || null,
          });
          setEditingResource(null);
        } else {
          await createPracticeResourceAction({
            locationId: resourceForm.locationId,
            roomId: resourceForm.roomId || null,
            name: resourceForm.name,
            description: resourceForm.description || null,
          });
          setIsAddingResource(false);
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Erreur sauvegarde ressource');
      }
    });
  };

  const handleToggleResourceActive = (res: PracticeResourceDTO) => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await setPracticeResourceActiveAction(res.id, !res.isActive);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Erreur statut ressource');
      }
    });
  };

  const getProfessionLabel = (code: string) => {
    const prof = getParamedicalProfession(code);
    return prof?.shortLabel ?? prof?.label ?? code;
  };

  return (
    <div className="mt-4 space-y-6">
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Onglets structure">
          {PRACTICE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setErrorMessage(null);
              }}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* SECTION: LIEUX */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-base font-semibold text-gray-900">Lieux de consultation</h4>
            <button
              type="button"
              onClick={handleOpenAddLocation}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
            >
              Ajouter un lieu
            </button>
          </div>

          {(isAddingLocation || editingLocation) && (
            <form onSubmit={handleSaveLocation} className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
              <h5 className="font-medium text-gray-900">
                {editingLocation ? 'Modifier le lieu' : 'Nouveau lieu'}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Nom du lieu *</label>
                  <input
                    type="text"
                    required
                    value={locationForm.name}
                    onChange={e => setLocationForm({ ...locationForm, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="ex: Cabinet Principal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Fuseau horaire *</label>
                  <input
                    type="text"
                    required
                    value={locationForm.timezone}
                    onChange={e => setLocationForm({ ...locationForm, timezone: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="ex: Europe/Paris"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Adresse</label>
                  <input
                    type="text"
                    value={locationForm.address}
                    onChange={e => setLocationForm({ ...locationForm, address: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Ville</label>
                  <input
                    type="text"
                    value={locationForm.city}
                    onChange={e => setLocationForm({ ...locationForm, city: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Code postal</label>
                  <input
                    type="text"
                    value={locationForm.postalCode}
                    onChange={e => setLocationForm({ ...locationForm, postalCode: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Téléphone</label>
                  <input
                    type="text"
                    value={locationForm.phone}
                    onChange={e => setLocationForm({ ...locationForm, phone: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingLocation(false);
                    setEditingLocation(null);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          )}

          {overview.locations.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Aucun lieu configuré.</p>
          ) : (
            <ul className="divide-y divide-gray-200 border rounded-md">
              {overview.locations.map(loc => (
                <li key={loc.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-semibold text-gray-900">{loc.name}</p>
                      {loc.isPrimary && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Principal
                        </span>
                      )}
                      {!loc.isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Inactif
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {[loc.address, loc.postalCode, loc.city, loc.timezone].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!loc.isPrimary && loc.isActive && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryLocation(loc)}
                        disabled={isPending}
                        className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        Définir principal
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEditLocation(loc)}
                      disabled={isPending}
                      className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleLocationActive(loc)}
                      disabled={isPending}
                      className={`text-xs font-medium ${loc.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                    >
                      {loc.isActive ? 'Désactiver' : 'Activer'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SECTION: PRATICIENS */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'practitioners' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-base font-semibold text-gray-900">Praticiens</h4>
            <button
              type="button"
              onClick={handleOpenAddPractitioner}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
            >
              Ajouter un praticien
            </button>
          </div>

          {(isAddingPractitioner || editingPractitioner) && (
            <form onSubmit={handleSavePractitioner} className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
              <h5 className="font-medium text-gray-900">
                {editingPractitioner ? 'Modifier le praticien' : 'Nouveau praticien'}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Nom & Prénom *</label>
                  <input
                    type="text"
                    required
                    value={practitionerForm.displayName}
                    onChange={e => setPractitionerForm({ ...practitionerForm, displayName: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="ex: Dr. Jeanne Dupont"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Profession *</label>
                  <select
                    value={practitionerForm.profession}
                    onChange={e => setPractitionerForm({ ...practitionerForm, profession: e.target.value as ParamedicalProfessionCode })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    {PARAMEDICAL_PROFESSION_CODES.map(code => (
                      <option key={code} value={code}>
                        {PARAMEDICAL_PROFESSIONS[code].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Email professionnel</label>
                  <input
                    type="email"
                    value={practitionerForm.email}
                    onChange={e => setPractitionerForm({ ...practitionerForm, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Téléphone</label>
                  <input
                    type="text"
                    value={practitionerForm.phone}
                    onChange={e => setPractitionerForm({ ...practitionerForm, phone: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700">Compte utilisateur associé (Optionnel)</label>
                  <select
                    value={practitionerForm.userId}
                    onChange={e => setPractitionerForm({ ...practitionerForm, userId: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">-- Aucun compte utilisateur lié --</option>
                    {overview.eligibleUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name ? `${u.name} (${u.email})` : u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingPractitioner(false);
                    setEditingPractitioner(null);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          )}

          {/* Modal Affectation Lieux */}
          {managingAssignmentsPractitioner && (
            <form onSubmit={handleSaveAssignments} className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-4">
              <h5 className="font-medium text-indigo-900">
                Affectation des lieux pour {managingAssignmentsPractitioner.displayName}
              </h5>
              <div className="space-y-2">
                {activeLocations.length === 0 ? (
                  <p className="text-xs text-indigo-700">Aucun lieu actif disponible.</p>
                ) : (
                  activeLocations.map(loc => {
                    const isSelected = assignmentsForm.selectedLocations.includes(loc.id);
                    const isPrimary = assignmentsForm.primaryLocation === loc.id;
                    return (
                      <div key={loc.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-800">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const updated = checked
                                ? [...assignmentsForm.selectedLocations, loc.id]
                                : assignmentsForm.selectedLocations.filter(id => id !== loc.id);
                              let primary = assignmentsForm.primaryLocation;
                              if (!checked && primary === loc.id) {
                                primary = updated[0] ?? '';
                              } else if (checked && !primary) {
                                primary = loc.id;
                              }
                              setAssignmentsForm({
                                selectedLocations: updated,
                                primaryLocation: primary,
                              });
                            }}
                            className="rounded text-indigo-600"
                          />
                          <span>{loc.name} ({loc.city ?? loc.timezone})</span>
                        </label>
                        {isSelected && (
                          <label className="flex items-center space-x-1 text-xs text-gray-600">
                            <input
                              type="radio"
                              name="primaryAssignment"
                              checked={isPrimary}
                              onChange={() => setAssignmentsForm({
                                ...assignmentsForm,
                                primaryLocation: loc.id,
                              })}
                              className="text-indigo-600"
                            />
                            <span>Lieu principal</span>
                          </label>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setManagingAssignmentsPractitioner(null)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isPending ? 'Enregistrement...' : 'Enregistrer les lieux'}
                </button>
              </div>
            </form>
          )}

          {overview.practitioners.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Aucun praticien configuré.</p>
          ) : (
            <ul className="divide-y divide-gray-200 border rounded-md">
              {overview.practitioners.map(prac => {
                const assignedLocs = overview.assignments
                  .filter(a => a.practitionerId === prac.id && a.isActive)
                  .map(a => {
                    const loc = overview.locations.find(l => l.id === a.locationId);
                    return loc ? `${loc.name}${a.isPrimary ? ' (Principal)' : ''}` : null;
                  })
                  .filter(Boolean);

                return (
                  <li key={prac.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-semibold text-gray-900">{prac.displayName}</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {getProfessionLabel(prac.profession)}
                        </span>
                        {!prac.isActive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Inactif
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {[prac.email, prac.phone].filter(Boolean).join(' • ')}
                      </p>
                      {assignedLocs.length > 0 && (
                        <p className="text-xs text-indigo-600 mt-1">
                          Lieux : {assignedLocs.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAssignments(prac)}
                        disabled={isPending}
                        className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        Affecter lieux
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditPractitioner(prac)}
                        disabled={isPending}
                        className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePractitionerActive(prac)}
                        disabled={isPending}
                        className={`text-xs font-medium ${prac.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                      >
                        {prac.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SECTION: SALLES */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'rooms' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-base font-semibold text-gray-900">Salles</h4>
            <button
              type="button"
              onClick={handleOpenAddRoom}
              disabled={activeLocations.length === 0}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              Ajouter une salle
            </button>
          </div>

          {(isAddingRoom || editingRoom) && (
            <form onSubmit={handleSaveRoom} className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
              <h5 className="font-medium text-gray-900">
                {editingRoom ? 'Modifier la salle' : 'Nouvelle salle'}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!editingRoom && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Lieu de consultation *</label>
                    <select
                      value={roomForm.locationId}
                      onChange={e => setRoomForm({ ...roomForm, locationId: e.target.value })}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      {activeLocations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700">Nom de la salle *</label>
                  <input
                    type="text"
                    required
                    value={roomForm.name}
                    onChange={e => setRoomForm({ ...roomForm, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="ex: Salle 1 (Grand plateau)"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700">Description</label>
                  <input
                    type="text"
                    value={roomForm.description}
                    onChange={e => setRoomForm({ ...roomForm, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingRoom(false);
                    setEditingRoom(null);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          )}

          {overview.rooms.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Aucune salle configurée.</p>
          ) : (
            <ul className="divide-y divide-gray-200 border rounded-md">
              {overview.rooms.map(room => {
                const loc = overview.locations.find(l => l.id === room.locationId);
                return (
                  <li key={room.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-semibold text-gray-900">{room.name}</p>
                        {!room.isActive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Inactif
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Lieu : {loc?.name ?? 'Lieu inconnu'} {room.description ? `• ${room.description}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditRoom(room)}
                        disabled={isPending}
                        className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleRoomActive(room)}
                        disabled={isPending}
                        className={`text-xs font-medium ${room.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                      >
                        {room.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SECTION: RESSOURCES */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-base font-semibold text-gray-900">Ressources & Équipements</h4>
            <button
              type="button"
              onClick={handleOpenAddResource}
              disabled={activeLocations.length === 0}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              Ajouter une ressource
            </button>
          </div>

          {(isAddingResource || editingResource) && (
            <form onSubmit={handleSaveResource} className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
              <h5 className="font-medium text-gray-900">
                {editingResource ? 'Modifier la ressource' : 'Nouvelle ressource'}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!editingResource && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Lieu de consultation *</label>
                      <select
                        value={resourceForm.locationId}
                        onChange={e => {
                          const newLoc = e.target.value;
                          setResourceForm({ ...resourceForm, locationId: newLoc, roomId: '' });
                        }}
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      >
                        {activeLocations.map(loc => (
                          <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Salle associée (Optionnel)</label>
                      <select
                        value={resourceForm.roomId}
                        onChange={e => setResourceForm({ ...resourceForm, roomId: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      >
                        <option value="">-- Aucune salle spécifique --</option>
                        {overview.rooms
                          .filter(r => r.locationId === resourceForm.locationId && r.isActive)
                          .map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700">Nom de la ressource *</label>
                  <input
                    type="text"
                    required
                    value={resourceForm.name}
                    onChange={e => setResourceForm({ ...resourceForm, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="ex: Table d'ostéopathie hydraulique"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700">Description</label>
                  <input
                    type="text"
                    value={resourceForm.description}
                    onChange={e => setResourceForm({ ...resourceForm, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingResource(false);
                    setEditingResource(null);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          )}

          {overview.resources.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Aucune ressource configurée.</p>
          ) : (
            <ul className="divide-y divide-gray-200 border rounded-md">
              {overview.resources.map(res => {
                const loc = overview.locations.find(l => l.id === res.locationId);
                const room = overview.rooms.find(r => r.id === res.roomId);
                return (
                  <li key={res.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-semibold text-gray-900">{res.name}</p>
                        {!res.isActive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Inactif
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Lieu : {loc?.name ?? 'Lieu inconnu'}
                        {room ? ` • Salle : ${room.name}` : ''}
                        {res.description ? ` • ${res.description}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditResource(res)}
                        disabled={isPending}
                        className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleResourceActive(res)}
                        disabled={isPending}
                        className={`text-xs font-medium ${res.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                      >
                        {res.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
