import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { requireFieldServiceContext } from '@/lib/workspaces/field-service/context';
import { getFieldServiceAssetById } from '@/lib/services/field-service-assets.service';
import { FIELD_SERVICE_ASSET_CATEGORY_LABELS } from '@/lib/workspaces/field-service/assets';
import { headers } from 'next/headers';
import PrintButton from './PrintButton';

export const metadata = { title: 'Étiquette équipement | MonService' };

/**
 * Étiquette imprimable à coller sur l'équipement. Le QR code ouvre la fiche
 * dans MonService : l'accès reste soumis à la connexion du professionnel et à
 * la RLS, aucune donnée n'est exposée publiquement.
 */
export default async function AssetLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireFieldServiceContext();
  const asset = await getFieldServiceAssetById(ctx.organizationId, id);
  if (!asset) notFound();

  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const proto = requestHeaders.get('x-forwarded-proto') ?? 'https';
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  const base = configured && URL.canParse(configured) ? configured : host ? `${proto}://${host}` : 'http://localhost:3000';
  const target = new URL(`/operations/equipements/${asset.id}`, base).toString();
  const qr = await QRCode.toDataURL(target, { errorCorrectionLevel: 'M', margin: 1, width: 320 });

  return (
    <div className="p-4 sm:p-8 max-w-xl mx-auto space-y-6">
      <div className="print:hidden flex items-center justify-between gap-3">
        <a href={`/operations/equipements/${asset.id}`} className="text-sm font-medium text-gray-500 hover:text-gray-900">← Retour à la fiche</a>
        <PrintButton />
      </div>
      <div className="border-2 border-gray-900 rounded-2xl p-5 flex items-center gap-5 bg-white text-gray-900" data-testid="asset-label">
        <img src={qr} alt={`QR code de la fiche ${asset.label}`} width={140} height={140} className="shrink-0" data-testid="asset-label-qr" />
        <div className="min-w-0 space-y-1">
          <p className="text-xs uppercase tracking-wide">{FIELD_SERVICE_ASSET_CATEGORY_LABELS[asset.category]}</p>
          <p className="text-lg font-bold leading-tight break-words">{asset.label}</p>
          {(asset.manufacturer || asset.model) && <p className="text-sm">{[asset.manufacturer, asset.model].filter(Boolean).join(' ')}</p>}
          {asset.serialNumber && <p className="text-sm">N° série : {asset.serialNumber}</p>}
          <p className="text-xs pt-1">{asset.clientName}{asset.siteCity ? ` · ${asset.siteCity}` : ''}</p>
        </div>
      </div>
      <p className="print:hidden text-xs text-gray-500">
        Scannez le code avec un téléphone connecté à MonService pour ouvrir la fiche et l’historique de l’équipement.
      </p>
    </div>
  );
}
