import 'server-only';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { db } from '@/lib/db/server';
import { appointments, appointmentTypes, patientProfiles, practicePractitioners } from '@/lib/db/schema';
import { AppError } from '@/lib/errors';
import {
  attendanceRates,
  fillMonthlyActivity,
  periodStart,
  type MonthlyActivity,
  type PracticeStatisticsPeriod,
} from '@/lib/workspaces/paramedical/statistics';

// Statistiques du cabinet (paramédical) : lecture seule, agrégats uniquement —
// aucune donnée nominative de patient ne sort de ce service. La RLS reste
// l'autorité ; le filtre d'organisation rend les requêtes explicites.

export type PracticeStatistics = {
  period: PracticeStatisticsPeriod;
  from: string;
  to: string;
  summary: {
    honored: number;
    noShow: number;
    cancelled: number;
    upcoming: number;
    honoredMinutes: number;
    noShowRate: number | null;
    cancellationRate: number | null;
    activePatients: number;
    newPatients: number;
  };
  monthly: MonthlyActivity[];
  byType: { name: string; honored: number; noShow: number; minutes: number }[];
  byPractitioner: { name: string; honored: number; noShow: number; cancelled: number }[];
  byWeekday: { weekday: number; honored: number }[];
  cancellationReasons: { code: string; count: number }[];
};

const honored = sql`(${appointments.status} = 'scheduled' AND ${appointments.endsAt} <= now())`;
const count = (condition: ReturnType<typeof sql>) => sql<number>`count(*) FILTER (WHERE ${condition})`.mapWith(Number);
const localStart = sql`(${appointments.startsAt} AT TIME ZONE ${appointments.timezone})`;

export async function getPracticeStatistics(organizationId: string, period: PracticeStatisticsPeriod, now: Date = new Date()): Promise<PracticeStatistics> {
  if (!organizationId) throw new AppError('Organisation requise', 400, 'BAD_REQUEST');
  const from = periodStart(period, now);
  const inOrg = eq(appointments.organizationId, organizationId);
  const inPeriod = and(inOrg, gte(appointments.startsAt, from), lt(appointments.startsAt, now));
  const trendFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));

  const [summaryRows, upcomingRows, newPatientRows, monthlyRows, typeRows, practitionerRows, weekdayRows, reasonRows] = await Promise.all([
    db.select({
      honored: count(honored),
      noShow: count(sql`${appointments.status} = 'no_show'`),
      cancelled: count(sql`${appointments.status} = 'cancelled'`),
      honoredMinutes: sql<number>`coalesce(sum(extract(epoch FROM (${appointments.endsAt} - ${appointments.startsAt})) / 60) FILTER (WHERE ${honored}), 0)`.mapWith(Number),
      activePatients: sql<number>`count(DISTINCT ${appointments.patientId}) FILTER (WHERE ${honored})`.mapWith(Number),
    }).from(appointments).where(inPeriod),
    db.select({ upcoming: sql<number>`count(*)`.mapWith(Number) }).from(appointments)
      .where(and(inOrg, eq(appointments.status, 'scheduled'), gte(appointments.startsAt, now))),
    db.select({ newPatients: sql<number>`count(*)`.mapWith(Number) }).from(patientProfiles)
      .where(and(eq(patientProfiles.organizationId, organizationId), gte(patientProfiles.createdAt, from), lt(patientProfiles.createdAt, now))),
    db.select({
      month: sql<string>`to_char(date_trunc('month', ${localStart}), 'YYYY-MM')`,
      honored: count(honored),
      noShow: count(sql`${appointments.status} = 'no_show'`),
      cancelled: count(sql`${appointments.status} = 'cancelled'`),
    }).from(appointments).where(and(inOrg, gte(appointments.startsAt, trendFrom), lt(appointments.startsAt, now)))
      .groupBy(sql`date_trunc('month', ${localStart})`),
    db.select({
      name: appointmentTypes.name,
      honored: count(honored),
      noShow: count(sql`${appointments.status} = 'no_show'`),
      minutes: sql<number>`coalesce(sum(extract(epoch FROM (${appointments.endsAt} - ${appointments.startsAt})) / 60) FILTER (WHERE ${honored}), 0)`.mapWith(Number),
    }).from(appointments)
      .innerJoin(appointmentTypes, and(eq(appointmentTypes.id, appointments.appointmentTypeId), eq(appointmentTypes.organizationId, appointments.organizationId)))
      .where(inPeriod).groupBy(appointmentTypes.id, appointmentTypes.name),
    db.select({
      name: practicePractitioners.displayName,
      honored: count(honored),
      noShow: count(sql`${appointments.status} = 'no_show'`),
      cancelled: count(sql`${appointments.status} = 'cancelled'`),
    }).from(appointments)
      .innerJoin(practicePractitioners, and(eq(practicePractitioners.id, appointments.practitionerId), eq(practicePractitioners.organizationId, appointments.organizationId)))
      .where(inPeriod).groupBy(practicePractitioners.id, practicePractitioners.displayName),
    db.select({
      weekday: sql<number>`extract(isodow FROM ${localStart})`.mapWith(Number),
      honored: sql<number>`count(*)`.mapWith(Number),
    }).from(appointments).where(and(inPeriod, honored)).groupBy(sql`extract(isodow FROM ${localStart})`),
    db.select({
      code: sql<string>`coalesce(${appointments.cancellationReasonCode}, 'other')`,
      count: sql<number>`count(*)`.mapWith(Number),
    }).from(appointments).where(and(inPeriod, eq(appointments.status, 'cancelled')))
      .groupBy(sql`coalesce(${appointments.cancellationReasonCode}, 'other')`),
  ]);

  const summary = summaryRows[0] ?? { honored: 0, noShow: 0, cancelled: 0, honoredMinutes: 0, activePatients: 0 };
  return {
    period,
    from: from.toISOString(),
    to: now.toISOString(),
    summary: {
      ...summary,
      honoredMinutes: Math.round(summary.honoredMinutes),
      upcoming: upcomingRows[0]?.upcoming ?? 0,
      newPatients: newPatientRows[0]?.newPatients ?? 0,
      ...attendanceRates(summary),
    },
    monthly: fillMonthlyActivity(monthlyRows, 12, now),
    byType: typeRows.map((row) => ({ ...row, minutes: Math.round(row.minutes) })).sort((a, b) => b.honored - a.honored),
    byPractitioner: practitionerRows.sort((a, b) => b.honored - a.honored),
    byWeekday: weekdayRows.sort((a, b) => a.weekday - b.weekday),
    cancellationReasons: reasonRows.sort((a, b) => b.count - a.count),
  };
}
