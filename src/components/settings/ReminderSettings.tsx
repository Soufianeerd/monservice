'use client';

import React, { useState, useEffect } from 'react';
import { ReminderSettings } from '@/lib/data/interfaces/reminder.interface';

export default function ReminderSettingsForm({ organizationId }: { organizationId: string }) {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      let data = null;
      if (!data) {
        // Mock default
        data = {
          id: `rs_${organizationId}`,
          organizationId,
          invoiceOverdueEnabled: true,
          invoiceOverdueDays: [7, 14, 30],
          quoteReminderEnabled: true,
          quoteReminderDays: [7, 14],
          quoteExpiringEnabled: true,
          quoteExpiringDays: 3,
        };
      }
      setSettings(data);
      setLoading(false);
    };
    fetchSettings();
  }, [organizationId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      // mock saving
      await new Promise(r => setTimeout(r, 500));
      setMessage('Paramètres enregistrés avec succès.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleManualCheck = async () => {
    try {
      const res = await fetch(`/api/reminders/check?organizationId=${organizationId}`);
      const data = await res.json();
      if (res.ok) {
        alert(`${data.count} relance(s) envoyée(s).`);
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Erreur lors du check manuel.');
    }
  };

  if (loading) return <div>Chargement des paramètres...</div>;
  if (!settings) return null;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="space-y-6">
        {message && <div className="p-4 bg-green-50 text-green-700 rounded-md">{message}</div>}

        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6 border border-gray-200">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Relances Factures</h3>
              <p className="mt-1 text-sm text-gray-500">
                Configurez les relances pour les factures impayées.
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2 space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="invoiceOverdueEnabled"
                    type="checkbox"
                    checked={settings.invoiceOverdueEnabled}
                    onChange={(e) => setSettings({ ...settings, invoiceOverdueEnabled: e.target.checked })}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="invoiceOverdueEnabled" className="font-medium text-gray-700">Activer les relances automatiques</label>
                  <p className="text-gray-500">Envoyer un email lorsque la facture est en retard.</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Jours de retard (séparés par des virgules)</label>
                <input
                  type="text"
                  value={settings.invoiceOverdueDays.join(', ')}
                  onChange={(e) => setSettings({ ...settings, invoiceOverdueDays: e.target.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)) })}
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="ex: 7, 14, 30"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6 border border-gray-200">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Relances Devis</h3>
              <p className="mt-1 text-sm text-gray-500">
                Configurez les relances pour les devis envoyés.
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2 space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="quoteReminderEnabled"
                    type="checkbox"
                    checked={settings.quoteReminderEnabled}
                    onChange={(e) => setSettings({ ...settings, quoteReminderEnabled: e.target.checked })}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="quoteReminderEnabled" className="font-medium text-gray-700">Relancer les devis non signés</label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Jours après l&apos;envoi (séparés par des virgules)</label>
                <input
                  type="text"
                  value={settings.quoteReminderDays.join(', ')}
                  onChange={(e) => setSettings({ ...settings, quoteReminderDays: e.target.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)) })}
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-start mt-4">
                  <div className="flex items-center h-5">
                    <input
                      id="quoteExpiringEnabled"
                      type="checkbox"
                      checked={settings.quoteExpiringEnabled}
                      onChange={(e) => setSettings({ ...settings, quoteExpiringEnabled: e.target.checked })}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="quoteExpiringEnabled" className="font-medium text-gray-700">Rappel expiration devis</label>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700">Jours avant expiration</label>
                  <input
                    type="number"
                    value={settings.quoteExpiringDays}
                    onChange={(e) => setSettings({ ...settings, quoteExpiringDays: parseInt(e.target.value) || 0 })}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:max-w-xs shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleManualCheck}
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Lancer un check manuel (Test)
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
