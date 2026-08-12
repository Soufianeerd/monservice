import { NextRequest, NextResponse } from 'next/server';
import { invoiceService } from '@/lib/services/invoice.service';
import { storageService } from '@/lib/storage/storage.service';
import { AppError } from '@/lib/errors';
import { requireSession } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const format = request.nextUrl.searchParams.get('format') || 'pdf'; // pdf, xml, zip

    const ctx = await requireSession();

    const invoice = await invoiceService.getById(id);
    if (!invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    const isIssuer = ctx.organizationId && invoice.organizationId === ctx.organizationId;
    const isRecipient = invoice.clientId === ctx.userId || invoice.professionalId === ctx.userId;
    if (!isIssuer && !isRecipient) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    if (format === 'xml' || format === 'zip') {
      if (!invoice.structuredInvoicePath) {
         return NextResponse.json({ error: 'Facture structurée non disponible' }, { status: 404 });
      }
      
      const buffer = await storageService.getFileBuffer(invoice.structuredInvoicePath);
      const isZip = invoice.structuredInvoicePath.endsWith('.zip');
      const filename = invoice.structuredInvoicePath.split('/').pop() || `invoice_${id}.${isZip ? 'zip' : 'xml'}`;
      
      return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
          'Content-Type': isZip ? 'application/zip' : 'application/xml',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Default to PDF (legacy)
    // Here we would generate the standard PDF using @react-pdf/renderer
    // But for the scope of this prompt, we return an error if asking for PDF that isn't handled yet
    return NextResponse.json({ error: 'Format non supporté' }, { status: 400 });

  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
