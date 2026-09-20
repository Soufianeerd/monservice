import { NextRequest, NextResponse } from 'next/server';
import { invoiceService } from '@/lib/services/invoice.service';
import { storageService } from '@/lib/storage/storage.service';
import { requireSession } from '@/lib/auth/session';
import { toErrorResponse } from '@/lib/utils/api-response';

const ALLOWED_FORMATS = new Set(['xml', 'zip']);

function sanitizeFilename(name: string): string {
  // Remove control characters, quotes, path traversals
  return name.replace(/[\r\n\0"/\\]/g, '_').replace(/\.\./g, '_');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const format = request.nextUrl.searchParams.get('format') || 'pdf';

    if (!ALLOWED_FORMATS.has(format)) {
      return NextResponse.json(
        { error: 'Format non supporté. Formats autorisés : xml, zip' },
        { status: 400 }
      );
    }

    const ctx = await requireSession();

    const invoice = await invoiceService.getById(id);
    if (!invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    const isIssuer =
      ctx.profileType === 'professional' &&
      Boolean(ctx.organizationId) &&
      invoice.organizationId === ctx.organizationId;
    const isRecipient =
      ctx.profileType === 'client' &&
      invoice.recipientUserId === ctx.userId;

    if (!isIssuer && !isRecipient) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    if (!invoice.structuredInvoicePath) {
      return NextResponse.json({ error: 'Facture structurée non disponible' }, { status: 404 });
    }
    
    const buffer = await storageService.getFileBuffer(invoice.structuredInvoicePath);
    const isZip = invoice.structuredInvoicePath.endsWith('.zip');
    const rawFilename = invoice.structuredInvoicePath.split('/').pop() || `invoice_${id}.${isZip ? 'zip' : 'xml'}`;
    const filename = sanitizeFilename(rawFilename);
    
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': isZip ? 'application/zip' : 'application/xml',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error: unknown) {
    return toErrorResponse(error, 'Erreur lors du téléchargement de la facture');
  }
}
