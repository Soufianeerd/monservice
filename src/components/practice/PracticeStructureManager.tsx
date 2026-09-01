'use client';

import React, { useState } from 'react';
import type { PracticeStructureOverview } from '@/lib/practice-structure/types';

interface PracticeStructureManagerProps {
  overview: PracticeStructureOverview;
}

export function PracticeStructureManager({ overview }: PracticeStructureManagerProps) {
  const [activeTab, setActiveTab] = useState<'locations' | 'practitioners' | 'rooms' | 'resources'>('locations');

  return (
    <div className="mt-4">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {['locations', 'practitioners', 'rooms', 'resources'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'locations' && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Lieux de consultation</h4>
            {overview.locations.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun lieu configuré.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {overview.locations.map(loc => (
                  <li key={loc.id} className="py-4 flex justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {loc.name} {loc.isPrimary && <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Principal</span>}
                      </p>
                      <p className="text-sm text-gray-500">{loc.city} - {loc.timezone}</p>
                    </div>
                    <div>
                      {!loc.isActive && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactif</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'practitioners' && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Praticiens</h4>
            {overview.practitioners.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun praticien configuré.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {overview.practitioners.map(prac => (
                  <li key={prac.id} className="py-4 flex justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{prac.displayName}</p>
                      <p className="text-sm text-gray-500">{prac.profession}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'rooms' && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Salles</h4>
            {overview.rooms.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune salle configurée.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {overview.rooms.map(room => (
                  <li key={room.id} className="py-4">
                    <p className="text-sm font-medium text-gray-900">{room.name}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'resources' && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Ressources & Équipements</h4>
            {overview.resources.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune ressource configurée.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {overview.resources.map(res => (
                  <li key={res.id} className="py-4">
                    <p className="text-sm font-medium text-gray-900">{res.name}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
