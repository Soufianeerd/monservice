import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionContext } from '@/lib/auth/session';
import { listClientInterventions } from '@/lib/services/field-service-client-portal.service';
import { CLIENT_WORK_STATUS_LABELS, CLIENT_WORK_TYPE_LABELS, formatDateTimeFr } from '@/components/client/field-service-labels';

export const metadata = { title: 'Mes interventions | MonService' };

export default async function ClientInterventionsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.profileType !== 'client') redirect('/login');
  const interventions = await listClientInterventions(ctx.userId);

  return (
    <div className="space-y-6" data-testid="client-interventions">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes interventions</h1>
        <p className="text-sm text-gray-500 mt-1">Les travaux planifiés et réalisés chez vous par vos professionnels, avec leurs comptes rendus.</p>
      </div>

      {interventions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-sm text-gray-500" data-testid="client-interventions-empty">
          Aucune intervention pour le moment. Elles apparaîtront ici dès qu’un professionnel les aura planifiées.
        </div>
      ) : (
        <ul className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100" data-testid="client-interventions-list">
          {interventions.map((item) => {
            const status = CLIENT_WORK_STATUS_LABELS[item.status] ?? { label: item.status, style: 'bg-gray-100 text-gray-700 border-gray-200' };
            return (
              <li key={item.id}>
                <Link href={`/client/interventions/${item.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 hover:bg-gray-50" data-testid="client-intervention-row">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {item.reference} · {CLIENT_WORK_TYPE_LABELS[item.workType] ?? item.workType}
                      {item.providerName ? ` · ${item.providerName}` : ''}
                      {item.siteLabel ? ` · ${item.siteLabel}${item.siteCity ? `, ${item.siteCity}` : ''}` : ''}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 sm:w-44">{formatDateTimeFr(item.actualEnd ?? item.scheduledStart)}</p>
                  <div className="flex flex-wrap gap-2 sm:w-64 sm:justify-end">
                    {item.awaitingAcknowledgement > 0 && (
                      <span className="inline-flex px-2.5 py-0.5 rounded-full border text-xs font-medium bg-amber-50 text-amber-800 border-amber-200" data-testid="client-ack-pending">
                        Réception à signer
                      </span>
                    )}
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full border text-xs font-medium ${status.style}`}>{status.label}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
