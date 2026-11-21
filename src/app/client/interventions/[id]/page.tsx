import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionContext } from '@/lib/auth/session';
import { getClientIntervention } from '@/lib/services/field-service-client-portal.service';
import { FIELD_SERVICE_ASSET_CATEGORY_LABELS } from '@/lib/workspaces/field-service/assets';
import { CLIENT_WORK_STATUS_LABELS, CLIENT_WORK_TYPE_LABELS, formatDateTimeFr } from '@/components/client/field-service-labels';
import AcknowledgeReportForm from './AcknowledgeReportForm';

export const metadata = { title: 'Intervention | MonService' };

export default async function ClientInterventionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getSessionContext();
  if (!ctx || ctx.profileType !== 'client') redirect('/login');
  const order = await getClientIntervention(ctx.userId, id);
  if (!order) notFound();

  const status = CLIENT_WORK_STATUS_LABELS[order.status] ?? { label: order.status, style: 'bg-gray-100 text-gray-700 border-gray-200' };

  return (
    <div className="space-y-6 max-w-4xl" data-testid="client-intervention-detail">
      <Link href="/client/interventions" className="text-sm font-medium text-gray-500 hover:text-gray-900">← Mes interventions</Link>

      <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">{order.reference} · {CLIENT_WORK_TYPE_LABELS[order.workType] ?? order.workType}</p>
            <h1 className="text-2xl font-bold text-gray-900 break-words">{order.title}</h1>
          </div>
          <span className={`self-start inline-flex px-2.5 py-0.5 rounded-full border text-xs font-medium ${status.style}`} data-testid="client-intervention-status">{status.label}</span>
        </div>
        {order.description && <p className="text-sm text-gray-700 whitespace-pre-line">{order.description}</p>}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-xs text-gray-500">Professionnel</dt><dd className="text-gray-900">{order.providerName ?? '—'}{order.providerPhone ? ` · ${order.providerPhone}` : ''}</dd></div>
          <div><dt className="text-xs text-gray-500">Lieu</dt><dd className="text-gray-900">{order.siteLabel ? `${order.siteLabel} — ${[order.siteAddressLine1, order.sitePostalCode, order.siteCity].filter(Boolean).join(' ')}` : '—'}</dd></div>
          <div><dt className="text-xs text-gray-500">Créneau prévu</dt><dd className="text-gray-900">{formatDateTimeFr(order.scheduledStart)}{order.scheduledEnd ? ` → ${formatDateTimeFr(order.scheduledEnd)}` : ''}</dd></div>
          <div><dt className="text-xs text-gray-500">Réalisée</dt><dd className="text-gray-900">{order.actualEnd ? formatDateTimeFr(order.actualEnd) : 'Pas encore'}</dd></div>
        </dl>
      </section>

      {order.assets.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3" data-testid="client-intervention-assets">
          <h2 className="text-lg font-bold text-gray-900">Équipements concernés</h2>
          <ul className="divide-y divide-gray-100">
            {order.assets.map((asset) => (
              <li key={asset.id} className="py-2 text-sm">
                <span className="font-medium text-gray-900">{asset.label}</span>
                <span className="block text-xs text-gray-500">
                  {FIELD_SERVICE_ASSET_CATEGORY_LABELS[asset.category]}
                  {(asset.manufacturer || asset.model) ? ` · ${[asset.manufacturer, asset.model].filter(Boolean).join(' ')}` : ''}
                  {asset.serialNumber ? ` · N° ${asset.serialNumber}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4" data-testid="client-intervention-reports">
        <h2 className="text-lg font-bold text-gray-900">Comptes rendus</h2>
        {order.reports.length === 0 ? (
          <p className="text-sm text-gray-500">Le compte rendu sera disponible ici dès que le professionnel l’aura finalisé.</p>
        ) : (
          order.reports.map((report) => (
            <article key={report.id} className="border border-gray-100 rounded-xl p-4 space-y-3" data-testid="client-report">
              <p className="text-xs text-gray-500">Finalisé le {formatDateTimeFr(report.finalizedAt)}</p>
              <p className="font-medium text-gray-900 whitespace-pre-line">{report.summary}</p>
              {report.workPerformed && <p className="text-sm text-gray-700 whitespace-pre-line"><span className="font-medium">Travaux réalisés : </span>{report.workPerformed}</p>}
              {report.issuesFound && <p className="text-sm text-gray-700 whitespace-pre-line"><span className="font-medium">Constats : </span>{report.issuesFound}</p>}
              {report.recommendations && <p className="text-sm text-gray-700 whitespace-pre-line"><span className="font-medium">Recommandations : </span>{report.recommendations}</p>}
              {report.customerNotes && <p className="text-sm text-gray-700 whitespace-pre-line"><span className="font-medium">Notes pour vous : </span>{report.customerNotes}</p>}
              {report.acknowledgedAt ? (
                <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3" data-testid="client-report-acknowledged">
                  Réception signée par {report.ackSignerName} le {formatDateTimeFr(report.acknowledgedAt)}
                  {report.ackDecision === 'accepted_with_reservations' ? ` — avec réserves : ${report.ackComment}` : ' — sans réserve'}.
                </p>
              ) : (
                <AcknowledgeReportForm workReportId={report.id} />
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
