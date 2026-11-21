'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { saveAutomationSettingsAction } from '@/app/actions/growth.actions';
import type { AutomationDelivery, AutomationSettings } from '@/lib/services/automation.service';

const KIND_LABELS: Record<AutomationDelivery['kind'], string> = {
  invoice_overdue: 'Relance facture',
  quote_followup: 'Relance devis',
  review_request: 'Demande d’avis',
};

const STATUS_LABELS: Record<string, string> = {
  claimed: 'En cours',
  sent: 'Envoyé',
  failed: 'Échec',
  skipped: 'Ignoré',
};

function Toggle({ id, checked, onChange, disabled, label, description }: {
  id: string; checked: boolean; onChange: (value: boolean) => void; disabled: boolean; label: string; description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium text-gray-900">{label}</span>
        <span className="block text-gray-500">{description}</span>
      </label>
    </div>
  );
}

export default function AutomationSettingsForm({ initial, deliveries, isAdmin, hasPaymentDetails, hasReplyEmail }: {
  initial: AutomationSettings;
  deliveries: AutomationDelivery[];
  isAdmin: boolean;
  hasPaymentDetails: boolean;
  hasReplyEmail: boolean;
}) {
  const [settings, setSettings] = useState(initial);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const disabled = !isAdmin || pending;
  const set = <K extends keyof AutomationSettings>(key: K, value: AutomationSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-6" data-testid="automation-settings">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Relances et avis automatiques</h2>
        <p className="mt-1 text-sm text-gray-500">
          Chaque matin, MonService envoie à vos clients les rappels que vous activez ici, en votre nom, avec votre adresse en réponse. Un même rappel ne part jamais deux fois.
        </p>
      </div>

      {!isAdmin && (
        <p className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">Seul un administrateur de l’organisation peut modifier ces réglages.</p>
      )}
      {!hasReplyEmail && (
        <p className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
          Ajoutez l’adresse e-mail de l’entreprise dans <Link href="/parametres/organisation" className="underline">Organisation</Link> : vos clients pourront répondre directement aux rappels.
        </p>
      )}

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          startTransition(async () => {
            const result = await saveAutomationSettingsAction(settings);
            setMessage(result.ok ? { type: 'ok', text: 'Réglages enregistrés.' } : { type: 'error', text: result.error });
          });
        }}
      >
        <section className="bg-white shadow sm:rounded-lg border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Factures impayées</h3>
          <Toggle
            id="invoiceRemindersEnabled"
            checked={settings.invoiceRemindersEnabled}
            disabled={disabled}
            onChange={(value) => set('invoiceRemindersEnabled', value)}
            label="Relancer automatiquement les factures échues"
            description="Un rappel courtois à J+7, un second à J+15, un dernier rappel à J+30 après l’échéance. Rien n’est envoyé pour une facture réglée : pensez à enregistrer vos règlements."
          />
          {settings.invoiceRemindersEnabled && !hasPaymentDetails && (
            <p className="text-sm text-yellow-800">
              Vos coordonnées bancaires ne sont pas renseignées : ajoutez-les dans <Link href="/parametres/organisation" className="underline">Organisation</Link> pour qu’elles figurent dans les rappels.
            </p>
          )}
        </section>

        <section className="bg-white shadow sm:rounded-lg border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Devis sans réponse</h3>
          <Toggle
            id="quoteFollowupsEnabled"
            checked={settings.quoteFollowupsEnabled}
            disabled={disabled}
            onChange={(value) => set('quoteFollowupsEnabled', value)}
            label="Relancer une fois les devis envoyés restés sans réponse"
            description="Un seul message, tant que le devis est encore valable."
          />
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Délai après l’envoi (jours)</span>
            <input
              type="number"
              min={3}
              max={30}
              value={settings.quoteFollowupDays}
              disabled={disabled}
              onChange={(event) => set('quoteFollowupDays', Number.parseInt(event.target.value, 10) || 3)}
              className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </section>

        <section className="bg-white shadow sm:rounded-lg border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Avis clients vérifiés</h3>
          <Toggle
            id="reviewRequestsEnabled"
            checked={settings.reviewRequestsEnabled}
            disabled={disabled}
            onChange={(value) => set('reviewRequestsEnabled', value)}
            label="Demander un avis après chaque facture réglée"
            description="Le client reçoit un lien personnel, valable 30 jours. Son avis s’affiche sur votre vitrine publique ; vous pouvez y répondre, pas le modifier."
          />
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Délai après le règlement (jours)</span>
            <input
              type="number"
              min={0}
              max={30}
              value={settings.reviewRequestDelayDays}
              disabled={disabled}
              onChange={(event) => set('reviewRequestDelayDays', Number.parseInt(event.target.value, 10) || 0)}
              className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </section>

        {message && (
          <p role={message.type === 'error' ? 'alert' : 'status'} className={`text-sm ${message.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
        )}
        {isAdmin && (
          <div className="flex justify-end">
            <button type="submit" disabled={pending} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        )}
      </form>

      <section className="bg-white shadow sm:rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900">Derniers envois</h3>
        {deliveries.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Aucun envoi automatique pour le moment.</p>
        ) : (
          <table className="mt-4 min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Document</th>
                <th className="py-2 font-medium">État</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td className="py-2 pr-4">{new Date(delivery.claimedAt).toLocaleDateString('fr-FR')}</td>
                  <td className="py-2 pr-4">{KIND_LABELS[delivery.kind]}{delivery.kind === 'invoice_overdue' ? ` (${delivery.level}/3)` : ''}</td>
                  <td className="py-2 pr-4">{delivery.documentNumber ?? '—'}</td>
                  <td className="py-2">{STATUS_LABELS[delivery.status] ?? delivery.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
