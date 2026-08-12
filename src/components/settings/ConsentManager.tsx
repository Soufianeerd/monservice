'use client';

import { useState, useEffect } from 'react';
import { ConsentEvent } from '@/lib/data/interfaces/privacy.interface';
import { getOrganizationAction } from '@/app/actions/session';

export default function ConsentManager() {
  const [consents, setConsents] = useState<ConsentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConsents = async () => {
      try {
        const org = await getOrganizationAction();
        if (org) {
          // Mock data
          setConsents([
            {
              id: '1',
              consentType: 'marketing_email',
              consentValue: true,
              timestamp: new Date(),
              source: 'web_portal'
            }
          ]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConsents();
  }, []);

  const toggleConsent = async (consentType: string, currentValue: boolean) => {
    // In a real app, call the API
    setConsents(prev => prev.map(c => 
      c.consentType === consentType ? { ...c, consentValue: !currentValue, timestamp: new Date() } : c
    ));
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Gestion des consentements</h2>
        <p className="text-sm text-gray-500 mt-1">Vos préférences en matière de confidentialité et de communication</p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Chargement...</div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Communications Marketing</h3>
              <p className="text-sm text-gray-500">Recevoir des offres et des actualités de notre part.</p>
              <p className="text-xs text-gray-400 mt-1">
                Dernière modification : {consents[0]?.timestamp.toLocaleDateString()}
              </p>
            </div>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={consents[0]?.consentValue || false}
                  onChange={() => toggleConsent('marketing_email', consents[0]?.consentValue)}
                />
                <div className={`block w-14 h-8 rounded-full ${consents[0]?.consentValue ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${consents[0]?.consentValue ? 'translate-x-6' : ''}`}></div>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
