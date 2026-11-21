import type { Metadata } from 'next';
import Link from 'next/link';
import { requireProfessional } from '@/lib/auth/session';
import { getTreasury } from '@/lib/services/treasury.service';
import SalesJournalExport from '@/components/growth/SalesJournalExport';

export const metadata: Metadata = { title: 'Trésorerie' };

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' });

function Kpi({ label, value, hint, tone = 'default' }: { label: string; value: string; hint?: string; tone?: 'default' | 'warn' | 'good' }) {
  const color = tone === 'warn' ? 'text-red-700' : tone === 'good' ? 'text-green-700' : 'text-gray-900';
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export default async function TreasuryPage() {
  const ctx = await requireProfessional();
  const treasury = await getTreasury(ctx.organizationId);
  const maxMonthly = Math.max(1, ...treasury.monthly.map((month) => Math.max(month.collected, month.invoiced)));

  return (
    <div className="space-y-6" data-testid="treasury">
      <p className="text-sm text-gray-600">
        Calculée à partir de vos factures et des règlements que vous enregistrez sur chacune d’elles. Montants TTC.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Encaissé ce mois-ci" value={euro.format(treasury.collectedThisMonth)} hint={`${euro.format(treasury.collectedThisYear)} depuis le 1er janvier`} tone="good" />
        <Kpi label="À encaisser" value={euro.format(treasury.outstanding)} hint={`${treasury.outstandingCount} facture${treasury.outstandingCount > 1 ? 's' : ''} ouverte${treasury.outstandingCount > 1 ? 's' : ''}`} />
        <Kpi label="En retard" value={euro.format(treasury.overdue)} hint={`${treasury.overdueCount} facture${treasury.overdueCount > 1 ? 's' : ''} échue${treasury.overdueCount > 1 ? 's' : ''}`} tone={treasury.overdue > 0 ? 'warn' : 'default'} />
        <Kpi label="Échéances à 30 jours" value={euro.format(treasury.dueNext30Days)} hint="Factures non échues" />
      </div>

      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900">Facturé et encaissé sur 12 mois</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4 font-medium">Mois</th>
                <th className="py-2 pr-4 font-medium">Facturé</th>
                <th className="py-2 pr-4 font-medium">Encaissé</th>
                <th className="py-2 font-medium w-1/2"><span className="sr-only">Comparaison</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {treasury.monthly.map((month) => (
                <tr key={month.month}>
                  <td className="py-2 pr-4 whitespace-nowrap">{monthLabel.format(new Date(`${month.month}-01T00:00:00Z`))}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{euro.format(month.invoiced)}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{euro.format(month.collected)}</td>
                  <td className="py-2" aria-hidden="true">
                    <div className="h-2 rounded bg-indigo-200" style={{ width: `${(month.invoiced / maxMonthly) * 100}%` }} />
                    <div className="mt-1 h-2 rounded bg-green-500" style={{ width: `${(month.collected / maxMonthly) * 100}%` }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gray-500">Barre claire : facturé · barre verte : encaissé.</p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">Ancienneté des créances</h2>
          <table className="mt-3 min-w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {treasury.aging.map((bucket) => (
                <tr key={bucket.label}>
                  <td className="py-2 pr-4">{bucket.label}</td>
                  <td className="py-2 pr-4 text-gray-500">{bucket.count}</td>
                  <td className="py-2 text-right font-medium">{euro.format(bucket.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">Clients en retard de paiement</h2>
          {treasury.debtors.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">Aucun retard.</p>
          ) : (
            <table className="mt-3 min-w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {treasury.debtors.map((debtor) => (
                  <tr key={debtor.clientName}>
                    <td className="py-2 pr-4">{debtor.clientName}</td>
                    <td className="py-2 pr-4 text-gray-500">{debtor.count} facture{debtor.count > 1 ? 's' : ''} · jusqu’à {debtor.oldestDaysLate} j</td>
                    <td className="py-2 text-right font-medium">{euro.format(debtor.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {treasury.overdueInvoices.length > 0 && (
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-medium text-gray-900">Factures échues</h2>
            <Link href="/parametres/relances" className="text-sm font-medium text-indigo-600">Relances automatiques</Link>
          </div>
          <table className="mt-3 min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4 font-medium">Facture</th>
                <th className="py-2 pr-4 font-medium">Client</th>
                <th className="py-2 pr-4 font-medium">Échéance</th>
                <th className="py-2 pr-4 font-medium">Retard</th>
                <th className="py-2 text-right font-medium">Reste dû</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {treasury.overdueInvoices.slice(0, 50).map((invoice) => (
                <tr key={invoice.id}>
                  <td className="py-2 pr-4"><Link href={`/facturation/factures/${invoice.id}`} className="text-indigo-600 hover:text-indigo-700">{invoice.number}</Link></td>
                  <td className="py-2 pr-4">{invoice.clientName}</td>
                  <td className="py-2 pr-4">{new Date(`${invoice.dueDate}T00:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC' })}</td>
                  <td className="py-2 pr-4">{invoice.daysLate} j</td>
                  <td className="py-2 text-right font-medium">{euro.format(invoice.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <SalesJournalExport />
    </div>
  );
}
