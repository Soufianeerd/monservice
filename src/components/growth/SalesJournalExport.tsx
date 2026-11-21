'use client';

import { useState } from 'react';

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const firstOfPreviousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastOfPreviousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return { from: firstOfPreviousMonth.toISOString().slice(0, 10), to: lastOfPreviousMonth.toISOString().slice(0, 10) };
}

export default function SalesJournalExport() {
  const [range, setRange] = useState(defaultRange);
  const valid = range.from && range.to && range.from <= range.to;
  const href = `/api/exports/ventes?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-medium text-gray-900">Export pour votre comptable</h2>
      <p className="mt-1 text-sm text-gray-500">Journal des ventes au format CSV (séparateur point-virgule), lisible dans Excel et importable par la plupart des logiciels comptables.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block font-medium text-gray-700">Du</span>
          <input type="date" value={range.from} onChange={(event) => setRange({ ...range, from: event.target.value })} className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="block font-medium text-gray-700">Au</span>
          <input type="date" value={range.to} onChange={(event) => setRange({ ...range, to: event.target.value })} className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        {valid ? (
          <a href={href} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700" data-testid="sales-journal-export">Télécharger le journal des ventes</a>
        ) : (
          <span className="text-sm text-red-600">La date de début doit précéder la date de fin.</span>
        )}
      </div>
    </section>
  );
}
