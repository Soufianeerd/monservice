'use client';

import { useEffect, useState } from 'react';
import { findAllAction } from '@/app/actions/client.actions';
import { listPatientsAction } from '@/app/actions/patient-registry.actions';
import { searchPatientsAction } from '@/app/actions/scheduling.actions';

/** Lecture seule : la liaison administrative est créée uniquement au clic Enregistrer. */
export function useBillingRecipients(organizationId: string | undefined, patients: boolean) {
  const [query, setQuery] = useState('');
  const [recipients, setRecipients] = useState<{ id: string; name: string; company?: string }[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!organizationId) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const result = patients
          ? query.trim().length >= 2
            ? (await searchPatientsAction(query.trim(), 25)).map(patient => ({ id: patient.id, name: patient.displayName }))
            : (await listPatientsAction({ active: 'active', limit: 100 })).rows.map(patient => ({ id: patient.id, name: `${patient.usedFirstName || patient.firstBirthName} ${patient.usedName || patient.birthName}` }))
          : await findAllAction(organizationId);
        if (active) { setRecipients(result); setError(''); }
      } catch {
        if (active) { setRecipients([]); setError('Impossible de charger les destinataires. Réessayez.'); }
      }
    }, query ? 300 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [organizationId, patients, query]);
  return { recipients, query, setQuery, error };
}
