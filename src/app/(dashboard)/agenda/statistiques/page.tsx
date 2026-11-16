import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireProfessional } from '@/lib/auth/session';
import { organizationService } from '@/lib/services/organization.service';
import { getPracticeStatistics } from '@/lib/services/practice-statistics.service';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import {
  CANCELLATION_REASON_LABELS,
  formatHours,
  monthLabel,
  parsePracticeStatisticsPeriod,
  PRACTICE_STATISTICS_PERIOD_LABELS,
  PRACTICE_STATISTICS_PERIODS,
  WEEKDAY_LABELS,
} from '@/lib/workspaces/paramedical/statistics';
import ActivityChart from './ActivityChart';

export const metadata = { title: 'Statistiques du cabinet' };

function Tile({ label, value, hint, testId }: { label: string; value: string; hint?: string; testId: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4" data-testid={testId}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

const percent = (value: number | null) => (value === null ? '—' : `${value.toLocaleString('fr-FR')} %`);

export default async function PracticeStatisticsPage(props: { searchParams: Promise<{ periode?: string | string[] }> }) {
  const context = await requireProfessional();
  const organization = await organizationService.getById(context.organizationId);
  if (!organization) notFound();
  const workspace = resolveWorkspace({ sector: organization.sector, profession: organization.profession, country: organization.country });
  if (workspace.type !== 'paramedical') redirect('/dashboard');

  const { periode } = await props.searchParams;
  const period = parsePracticeStatisticsPeriod(periode);
  const stats = await getPracticeStatistics(organization.id, period);
  const { summary } = stats;
  const hasActivity = summary.honored + summary.noShow + summary.cancelled > 0;
  const maxWeekday = Math.max(1, ...stats.byWeekday.map((row) => row.honored));

  return (
    <div className="space-y-6" data-testid="practice-statistics">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques du cabinet</h1>
          <p className="mt-1 text-sm text-gray-500">Activité des {PRACTICE_STATISTICS_PERIOD_LABELS[period]}, jusqu’à aujourd’hui. Chiffres agrégés, sans donnée nominative.</p>
        </div>
        <nav className="flex rounded-lg border border-gray-200 bg-white p-1 text-sm" aria-label="Période">
          {PRACTICE_STATISTICS_PERIODS.map((option) => (
            <Link
              key={option}
              href={`/agenda/statistiques?periode=${option}`}
              aria-current={option === period ? 'page' : undefined}
              className={`rounded-md px-3 py-1.5 font-medium ${option === period ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              data-testid={`period-${option}`}
            >
              {PRACTICE_STATISTICS_PERIOD_LABELS[option]}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile testId="stat-honored" label="Rendez-vous honorés" value={summary.honored.toLocaleString('fr-FR')} hint={`${formatHours(summary.honoredMinutes)} de séances`} />
        <Tile testId="stat-no-show-rate" label="Taux d’absence" value={percent(summary.noShowRate)} hint={`${summary.noShow} absence${summary.noShow > 1 ? 's' : ''} non excusée${summary.noShow > 1 ? 's' : ''}`} />
        <Tile testId="stat-cancellation-rate" label="Taux d’annulation" value={percent(summary.cancellationRate)} hint={`${summary.cancelled} rendez-vous annulé${summary.cancelled > 1 ? 's' : ''}`} />
        <Tile testId="stat-upcoming" label="Rendez-vous à venir" value={summary.upcoming.toLocaleString('fr-FR')} hint="Tous créneaux futurs planifiés" />
        <Tile testId="stat-active-patients" label="Patients vus" value={summary.activePatients.toLocaleString('fr-FR')} hint="Au moins une séance honorée" />
        <Tile testId="stat-new-patients" label="Nouveaux patients" value={summary.newPatients.toLocaleString('fr-FR')} hint="Dossiers créés sur la période" />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Activité des 12 derniers mois</h2>
        <ActivityChart data={stats.monthly.map((row) => ({ label: monthLabel(row.month), honored: row.honored, noShow: row.noShow, cancelled: row.cancelled }))} />
      </section>

      {!hasActivity && (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600" data-testid="practice-statistics-empty">
          Aucun rendez-vous sur cette période. Les statistiques se rempliront au fil de votre agenda.
        </p>
      )}

      {hasActivity && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-base font-semibold text-gray-900">Par type de séance</h2>
            <table className="mt-3 w-full text-sm" data-testid="stats-by-type">
              <thead><tr className="text-left text-xs uppercase text-gray-500"><th className="py-2 font-medium">Type</th><th className="py-2 text-right font-medium">Honorés</th><th className="py-2 text-right font-medium">Absences</th><th className="py-2 text-right font-medium">Durée</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {stats.byType.map((row) => (
                  <tr key={row.name}><td className="py-2 text-gray-900">{row.name}</td><td className="py-2 text-right">{row.honored}</td><td className="py-2 text-right">{row.noShow}</td><td className="py-2 text-right text-gray-500">{formatHours(row.minutes)}</td></tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-base font-semibold text-gray-900">Jours les plus chargés</h2>
            <ul className="mt-3 space-y-2 text-sm" data-testid="stats-by-weekday">
              {WEEKDAY_LABELS.map((label, index) => {
                const value = stats.byWeekday.find((row) => row.weekday === index + 1)?.honored ?? 0;
                return (
                  <li key={label} className="flex items-center gap-3">
                    <span className="w-20 text-gray-600">{label}</span>
                    <span className="h-2 flex-1 rounded bg-gray-100"><span className="block h-2 rounded bg-indigo-500" style={{ width: `${(value / maxWeekday) * 100}%` }} /></span>
                    <span className="w-8 text-right text-gray-900">{value}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          {stats.byPractitioner.length > 1 && (
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-base font-semibold text-gray-900">Par praticien</h2>
              <table className="mt-3 w-full text-sm" data-testid="stats-by-practitioner">
                <thead><tr className="text-left text-xs uppercase text-gray-500"><th className="py-2 font-medium">Praticien</th><th className="py-2 text-right font-medium">Honorés</th><th className="py-2 text-right font-medium">Absences</th><th className="py-2 text-right font-medium">Annulés</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.byPractitioner.map((row) => (
                    <tr key={row.name}><td className="py-2 text-gray-900">{row.name}</td><td className="py-2 text-right">{row.honored}</td><td className="py-2 text-right">{row.noShow}</td><td className="py-2 text-right">{row.cancelled}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {stats.cancellationReasons.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-base font-semibold text-gray-900">Motifs d’annulation</h2>
              <ul className="mt-3 divide-y divide-gray-100 text-sm" data-testid="stats-cancellation-reasons">
                {stats.cancellationReasons.map((row) => (
                  <li key={row.code} className="flex justify-between py-2"><span className="text-gray-700">{CANCELLATION_REASON_LABELS[row.code] ?? 'Autre'}</span><span className="font-medium text-gray-900">{row.count}</span></li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
