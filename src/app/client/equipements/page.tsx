import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionContext } from '@/lib/auth/session';
import { listClientAssets } from '@/lib/services/field-service-client-portal.service';
import {
  FIELD_SERVICE_ASSET_CATEGORY_LABELS,
  FIELD_SERVICE_ASSET_STATUS_LABELS,
} from '@/lib/workspaces/field-service/assets';
import { formatDateTimeFr } from '@/components/client/field-service-labels';

export const metadata = { title: 'Mes équipements | MonService' };

export default async function ClientAssetsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.profileType !== 'client') redirect('/login');
  const assets = await listClientAssets(ctx.userId);

  return (
    <div className="space-y-6" data-testid="client-assets">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes équipements</h1>
        <p className="text-sm text-gray-500 mt-1">Les équipements suivis par vos professionnels : garanties, prochains entretiens et historique.</p>
      </div>
      {assets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-sm text-gray-500">Aucun équipement enregistré pour le moment.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map((asset) => (
            <article key={asset.id} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2" data-testid="client-asset-card">
              <p className="text-xs uppercase tracking-wide text-gray-500">{FIELD_SERVICE_ASSET_CATEGORY_LABELS[asset.category]}</p>
              <h2 className="text-lg font-bold text-gray-900 break-words">{asset.label}</h2>
              <p className="text-sm text-gray-600">
                {[asset.manufacturer, asset.model].filter(Boolean).join(' ') || 'Modèle non précisé'}
                {asset.serialNumber ? ` · N° ${asset.serialNumber}` : ''}
              </p>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-xs text-gray-500">État</dt><dd>{FIELD_SERVICE_ASSET_STATUS_LABELS[asset.status]}</dd></div>
                <div><dt className="text-xs text-gray-500">Professionnel</dt><dd>{asset.providerName ?? '—'}</dd></div>
                <div><dt className="text-xs text-gray-500">Fin de garantie</dt><dd>{formatDateTimeFr(asset.warrantyEndsOn, false)}</dd></div>
                <div><dt className="text-xs text-gray-500">Prochain entretien</dt><dd data-testid="client-asset-next-maintenance">{formatDateTimeFr(asset.nextMaintenanceOn, false)}</dd></div>
              </dl>
              {asset.interventions.length > 0 && (
                <ul className="border-t border-gray-100 pt-2 space-y-1 text-sm">
                  {asset.interventions.slice(0, 5).map((i) => (
                    <li key={i.workOrderId}>
                      <Link href={`/client/interventions/${i.workOrderId}`} className="text-indigo-700 hover:underline">
                        {formatDateTimeFr(i.date, false)} — {i.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
